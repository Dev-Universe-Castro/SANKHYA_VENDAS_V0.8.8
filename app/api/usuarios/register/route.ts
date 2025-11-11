
import { NextResponse } from 'next/server';
import { oracleAuthService } from '@/lib/oracle-auth-service';

export async function POST(request: Request) {
  try {
    // Parse o corpo da requisição
    const body = await request.text();
    console.log('📦 Corpo bruto recebido:', body);
    
    let userData;
    try {
      userData = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    console.log('📝 Dados recebidos para registro:', {
      idEmpresa: userData.idEmpresa,
      nome: userData.nome,
      email: userData.email,
      senha: userData.senha ? '***PREENCHIDO***' : 'VAZIO',
      funcao: userData.funcao,
      codVend: userData.codVend
    });

    // Validar campos obrigatórios
    if (!userData.nome || !userData.email || !userData.senha) {
      console.error('❌ Campos obrigatórios faltando:', {
        nome: !userData.nome,
        email: !userData.email,
        senha: !userData.senha
      });
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (!userData.idEmpresa) {
      console.error('❌ idEmpresa está faltando');
      return NextResponse.json(
        { error: 'ID da empresa é obrigatório' },
        { status: 400 }
      );
    }

    console.log('✅ Todos os campos validados. Registrando usuário...');

    const newUser = await oracleAuthService.register({
      idEmpresa: userData.idEmpresa,
      nome: userData.nome.trim(),
      email: userData.email.trim(),
      senha: userData.senha,
      funcao: userData.funcao || 'Vendedor',
      codVend: userData.codVend
    });

    console.log('✅ Usuário registrado com sucesso:', newUser.id);
    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error('❌ Erro ao registrar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar usuário' },
      { status: 500 }
    );
  }
}
