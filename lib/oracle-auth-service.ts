import { oracleService } from './oracle-db';
import { cryptoService } from './crypto-service';

export interface OracleUser {
  CODUSUARIO: number;
  ID_EMPRESA: number;
  NOME: string;
  EMAIL: string;
  SENHA: string;
  FUNCAO: string;
  STATUS: string;
  AVATAR?: string;
  DATACRIACAO: Date;
  DATAATUALIZACAO: Date;
  CODVEND?: number;
}

export interface OracleUserWithCompany extends OracleUser {
  EMPRESA?: string;
  CNPJ?: string;
}

class OracleAuthService {

  async login(email: string, senha: string): Promise<OracleUserWithCompany | null> {
    try {
      console.log('🔐 Tentativa de login Oracle:', email);

      const sql = `
        SELECT 
          u.CODUSUARIO,
          u.ID_EMPRESA,
          u.NOME,
          u.EMAIL,
          u.SENHA,
          u.FUNCAO,
          u.STATUS,
          u.AVATAR,
          u.DATACRIACAO,
          u.DATAATUALIZACAO,
          u.CODVEND,
          c.EMPRESA,
          c.CNPJ
        FROM AD_USUARIOSVENDAS u
        INNER JOIN AD_CONTRATOS c ON u.ID_EMPRESA = c.ID_EMPRESA
        WHERE UPPER(u.EMAIL) = UPPER(:email)
          AND u.STATUS = 'ativo'
          AND c.ATIVO = 'S'
      `;

      const user = await oracleService.executeOne<OracleUserWithCompany>(sql, { email });

      if (!user) {
        console.log('❌ Usuário não encontrado ou inativo');
        return null;
      }

      // Verificar senha
      const senhaValida = await cryptoService.comparePassword(senha, user.SENHA);

      if (!senhaValida) {
        console.log('❌ Senha inválida');
        return null;
      }

      // Remover senha do objeto retornado
      const { SENHA, ...userSemSenha } = user;

      console.log('✅ Login realizado com sucesso:', userSemSenha.EMAIL);
      return userSemSenha as OracleUserWithCompany;

    } catch (error) {
      console.error('❌ Erro no login Oracle:', error);
      throw error;
    }
  }

  async register(userData: {
    idEmpresa: number;
    nome: string;
    email: string;
    senha: string;
    funcao?: string;
    codVend?: number;
  }): Promise<OracleUser> {
    try {
      // Verificar se email já existe
      const emailExiste = await this.checkEmailExists(userData.email, userData.idEmpresa);
      if (emailExiste) {
        throw new Error('E-mail já cadastrado para esta empresa');
      }

      // Hash da senha
      const senhaHash = await cryptoService.hashPassword(userData.senha);

      const sql = `
        INSERT INTO AD_USUARIOSVENDAS 
          (ID_EMPRESA, NOME, EMAIL, SENHA, FUNCAO, STATUS, CODVEND)
        VALUES 
          (:idEmpresa, :nome, :email, :senha, :funcao, 'pendente', :codVend)
        RETURNING CODUSUARIO INTO :codusuario
      `;

      const binds = {
        idEmpresa: userData.idEmpresa,
        nome: userData.nome,
        email: userData.email,
        senha: senhaHash,
        funcao: userData.funcao || 'Vendedor',
        codVend: userData.codVend || null,
        codusuario: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      };

      const connection = await oracleService.getConnection();
      const result = await connection.execute(sql, binds);
      await connection.commit();
      await connection.close();

      const codusuario = (result.outBinds as any).codusuario[0];

      console.log('✅ Usuário registrado com sucesso:', userData.email);

      return await this.getUserById(codusuario);

    } catch (error) {
      console.error('❌ Erro ao registrar usuário:', error);
      throw error;
    }
  }

  async getUserById(codusuario: number): Promise<OracleUser> {
    const sql = `
      SELECT * FROM AD_USUARIOSVENDAS 
      WHERE CODUSUARIO = :codusuario
    `;

    const user = await oracleService.executeOne<OracleUser>(sql, { codusuario });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }

  async getUserByEmail(email: string, idEmpresa: number): Promise<OracleUser | null> {
    const sql = `
      SELECT * FROM AD_USUARIOSVENDAS 
      WHERE UPPER(EMAIL) = UPPER(:email)
        AND ID_EMPRESA = :idEmpresa
    `;

    return await oracleService.executeOne<OracleUser>(sql, { email, idEmpresa });
  }

  async checkEmailExists(email: string, idEmpresa: number): Promise<boolean> {
    const user = await this.getUserByEmail(email, idEmpresa);
    return user !== null;
  }

  async updateUserStatus(codusuario: number, status: 'ativo' | 'pendente' | 'bloqueado'): Promise<void> {
    const sql = `
      UPDATE AD_USUARIOSVENDAS 
      SET STATUS = :status
      WHERE CODUSUARIO = :codusuario
    `;

    await oracleService.executeQuery(sql, { status, codusuario });
    console.log(`✅ Status do usuário ${codusuario} atualizado para ${status}`);
  }

  async listUsers(idEmpresa?: number): Promise<OracleUserWithCompany[]> {
    let sql = `
      SELECT 
        u.CODUSUARIO,
        u.ID_EMPRESA,
        u.NOME,
        u.EMAIL,
        u.FUNCAO,
        u.STATUS,
        u.AVATAR,
        u.DATACRIACAO,
        u.DATAATUALIZACAO,
        u.CODVEND,
        c.EMPRESA,
        c.CNPJ
      FROM AD_USUARIOSVENDAS u
      INNER JOIN AD_CONTRATOS c ON u.ID_EMPRESA = c.ID_EMPRESA
    `;

    if (idEmpresa) {
      sql += ` WHERE u.ID_EMPRESA = :idEmpresa`;
      return await oracleService.executeQuery<OracleUserWithCompany>(sql, { idEmpresa });
    }

    return await oracleService.executeQuery<OracleUserWithCompany>(sql);
  }
}

export const oracleAuthService = new OracleAuthService();

// Necessário importar oracledb para BIND_OUT
import oracledb from 'oracledb';