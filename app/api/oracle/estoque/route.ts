
import { NextRequest, NextResponse } from 'next/server'
import { oracleService } from '@/lib/oracle-db'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codProd = searchParams.get('codProd')

    if (!codProd) {
      return NextResponse.json({ error: 'CODPROD é obrigatório' }, { status: 400 })
    }

    // Obter ID da empresa do usuário logado
    const cookieStore = cookies()
    const userCookie = cookieStore.get('user')

    if (!userCookie) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
    }

    const userData = JSON.parse(userCookie.value)
    const idEmpresa = userData.ID_EMPRESA

    if (!idEmpresa) {
      return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 })
    }

    console.log(`📦 Buscando estoque do produto ${codProd} para empresa ${idEmpresa}`)

    // Buscar estoque da tabela AS_ESTOQUES
    const sql = `
      SELECT 
        CODPROD,
        CODLOCAL,
        ESTOQUE,
        ATIVO,
        CONTROLE
      FROM AS_ESTOQUES
      WHERE ID_SISTEMA = :idEmpresa
        AND CODPROD = :codProd
        AND SANKHYA_ATUAL = 'S'
        AND ATIVO = 'S'
        AND CONTROLE = 'E'
      ORDER BY CODLOCAL
    `

    const estoques = await oracleService.executeQuery(sql, { idEmpresa, codProd })

    // Calcular estoque total
    const estoqueTotal = estoques.reduce((sum, est: any) => {
      return sum + parseFloat(est.ESTOQUE || '0')
    }, 0)

    console.log(`✅ Estoque total: ${estoqueTotal}`)

    return NextResponse.json({
      estoques,
      total: estoques.length,
      estoqueTotal
    })

  } catch (error: any) {
    console.error('❌ Erro ao buscar estoque:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar estoque' },
      { status: 500 }
    )
  }
}
