import { NextRequest, NextResponse } from 'next/server'
import { oracleService } from '@/lib/oracle-db'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando prefetch de parceiros e produtos do Oracle...')

    // Obter ID da empresa do usuário logado
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    console.log('🍪 Cookie de usuário:', userCookie ? 'encontrado' : 'não encontrado');

    if (!userCookie) {
      console.error('❌ Usuário não autenticado - cookie não encontrado');
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userData = JSON.parse(userCookie.value)
    const idEmpresa = userData.ID_EMPRESA

    console.log('👤 Dados do usuário do cookie:', {
      id: userData.id,
      name: userData.name,
      ID_EMPRESA: idEmpresa
    });

    if (!idEmpresa) {
      return NextResponse.json(
        { error: 'Empresa não identificada' },
        { status: 400 }
      )
    }

    console.log(`📊 Buscando dados para empresa ${idEmpresa}`)

    // Fazer requisições em paralelo para otimizar tempo
    const [parceirosResult, produtosResult] = await Promise.allSettled([
      prefetchParceiros(idEmpresa),
      prefetchProdutos(idEmpresa)
    ])

    // Log de resultados
    const parceirosCount = parceirosResult.status === 'fulfilled' ? parceirosResult.value.count : 0
    const produtosCount = produtosResult.status === 'fulfilled' ? produtosResult.value.count : 0

    const parceirosData = parceirosResult.status === 'fulfilled' ? parceirosResult.value.data : []
    const produtosData = produtosResult.status === 'fulfilled' ? produtosResult.value.data : []

    if (parceirosResult.status === 'fulfilled') {
      console.log(`✅ Parceiros carregados: ${parceirosCount} registros`)
    } else {
      console.error('❌ Erro ao carregar parceiros:', {
        message: parceirosResult.reason?.message || 'Erro desconhecido',
        stack: parceirosResult.reason?.stack
      })
    }

    if (produtosResult.status === 'fulfilled') {
      console.log(`✅ Produtos carregados: ${produtosCount} registros`)
    } else {
      console.error('❌ Erro ao carregar produtos:', {
        message: produtosResult.reason?.message || 'Erro desconhecido',
        stack: produtosResult.reason?.stack
      })
    }

    console.log(`✅ Prefetch concluído - ${parceirosCount} parceiros, ${produtosCount} produtos`)

    // Retornar dados completos para armazenar no sessionStorage do cliente
    return NextResponse.json({
      success: true,
      parceiros: parceirosCount,
      produtos: produtosCount,
      parceirosData: parceirosData,
      produtosData: produtosData
    })
  } catch (error) {
    console.error('❌ Erro no prefetch de dados:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer prefetch' },
      { status: 500 }
    )
  }
}

// Prefetch de parceiros do Oracle
async function prefetchParceiros(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando parceiros da empresa ${idEmpresa} do Oracle...`)

    const sql = `
      SELECT 
        CODPARC,
        NOMEPARC,
        CGC_CPF,
        CODCID,
        ATIVO,
        TIPPESSOA,
        RAZAOSOCIAL,
        IDENTINSCESTAD,
        CEP,
        CODEND,
        NUMEND,
        COMPLEMENTO,
        CODBAI,
        LATITUDE,
        LONGITUDE,
        CLIENTE,
        CODVEND
      FROM AS_PARCEIROS
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
        AND CLIENTE = 'S'
      ORDER BY NOMEPARC
    `

    const parceiros = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${parceiros.length} parceiros encontrados no Oracle`)
    return { count: parceiros.length, data: parceiros }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de parceiros do Oracle:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de produtos do Oracle
async function prefetchProdutos(idEmpresa: number): Promise<{ count: number, data: any[] }> {
  try {
    console.log(`🔍 Buscando produtos da empresa ${idEmpresa} do Oracle...`)

    const sql = `
      SELECT 
        ID_SISTEMA,
        CODPROD,
        DESCRPROD,
        ATIVO,
        LOCAL,
        MARCA,
        CARACTERISTICAS,
        UNIDADE,
        VLRCOMERC,
        SANKHYA_ATUAL,
        DT_ULT_CARGA,
        DT_CRIACAO
      FROM AS_PRODUTOS
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
      ORDER BY DESCRPROD
    `

    const produtos = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${produtos.length} produtos encontrados no Oracle`)
    return { count: produtos.length, data: produtos }

  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de produtos do Oracle:', error)
    return { count: 0, data: [] }
  }
}