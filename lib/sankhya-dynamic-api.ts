
import axios from 'axios';
import { contratosService } from './contratos-service';

class SankhyaDynamicAPI {
  
  private tokenCache: Map<number, { token: string; expiresAt: number }> = new Map();

  async obterToken(idEmpresa: number, forceRefresh = false): Promise<string> {
    // Verificar cache
    if (!forceRefresh) {
      const cached = this.tokenCache.get(idEmpresa);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`✅ Token em cache válido para empresa ${idEmpresa}`);
        return cached.token;
      }
    }

    console.log(`🔐 Obtendo novo token para empresa ${idEmpresa}`);
    
    const credentials = await contratosService.getSankhyaCredentials(idEmpresa);
    const loginUrl = `${credentials.baseUrl}/login`;

    const response = await axios.post(loginUrl, {}, {
      headers: {
        'token': credentials.token,
        'appkey': credentials.appkey,
        'username': credentials.username,
        'password': credentials.password
      }
    });

    const token = response.data.bearerToken || response.data.token;
    
    if (!token) {
      throw new Error('Token não retornado pela API Sankhya');
    }

    // Cachear token (20 minutos)
    this.tokenCache.set(idEmpresa, {
      token,
      expiresAt: Date.now() + (20 * 60 * 1000)
    });

    console.log(`✅ Token obtido e cacheado para empresa ${idEmpresa}`);
    return token;
  }

  async fazerRequisicao(
    idEmpresa: number,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    data?: any,
    retryCount = 0
  ): Promise<any> {
    try {
      const credentials = await contratosService.getSankhyaCredentials(idEmpresa);
      const token = await this.obterToken(idEmpresa, retryCount > 0);
      
      const url = `${credentials.baseUrl}${endpoint}`;

      const config: any = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;

    } catch (error: any) {
      // Token expirado, tentar novamente
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        if (retryCount < 1) {
          console.log(`🔄 Token expirado, renovando para empresa ${idEmpresa}...`);
          return this.fazerRequisicao(idEmpresa, endpoint, method, data, retryCount + 1);
        }
      }

      console.error('❌ Erro na requisição Sankhya:', error.response?.data || error.message);
      throw error;
    }
  }

  limparCache(idEmpresa?: number) {
    if (idEmpresa) {
      this.tokenCache.delete(idEmpresa);
      console.log(`🗑️ Cache de token limpo para empresa ${idEmpresa}`);
    } else {
      this.tokenCache.clear();
      console.log('🗑️ Cache de tokens limpo para todas empresas');
    }
  }
}

export const sankhyaDynamicAPI = new SankhyaDynamicAPI();
