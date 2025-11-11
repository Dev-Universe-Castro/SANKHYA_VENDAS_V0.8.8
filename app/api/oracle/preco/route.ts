
import { NextRequest, NextResponse } from 'next/server'
import { oracleService } from '@/lib/oracle-db'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codProd = searchParams.get('codProd')
    const nutab = searchParams.get('nutab') || '0'

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

    console.log(`💰 Buscando preço do produto ${codProd} (NUTAB: ${nutab}) para empresa ${idEmpresa}`)

    // Buscar preço na tabela AS_EXCECAO_PRECO
    const sql = `
      SELECT 
        VLRVENDA,
        NUTAB,
        CODLOCAL
      FROM AS_EXCECAO_PRECO
      WHERE ID_SISTEMA = :idEmpresa
        AND CODPROD = :codProd
        AND NUTAB = :nutab
        AND SANKHYA_ATUAL = 'S'
      ORDER BY CODLOCAL
      FETCH FIRST 1 ROW ONLY
    `

    const result = await oracleService.executeOne(sql, { idEmpresa, codProd, nutab })

    const preco = result ? parseFloat(result.VLRVENDA || '0') : 0

    console.log(`✅ Preço encontrado: R$ ${preco}`)

    return NextResponse.json({ preco })

  } catch (error: any) {
    console.error('❌ Erro ao buscar preço:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar preço' },
      { status: 500 }
    )
  }
}
