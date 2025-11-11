
import { NextRequest, NextResponse } from 'next/server'
import { oracleService } from '@/lib/oracle-db'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
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

    console.log(`💰 Listando tabelas de preço para empresa ${idEmpresa}`)

    // Buscar tabelas de preço da AS_TABELA_PRECOS
    const sql = `
      SELECT 
        NUTAB,
        CODTAB,
        DTVIGOR,
        PERCENTUAL
      FROM AS_TABELA_PRECOS
      WHERE ID_SISTEMA = :idEmpresa
        AND SANKHYA_ATUAL = 'S'
      ORDER BY CODTAB
    `

    const tabelas = await oracleService.executeQuery(sql, { idEmpresa })

    console.log(`✅ ${tabelas.length} tabelas de preço encontradas`)

    return NextResponse.json({ tabelas })

  } catch (error: any) {
    console.error('❌ Erro ao listar tabelas de preço:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar tabelas de preço' },
      { status: 500 }
    )
  }
}
