// Serviço de prefetch de dados para otimizar o carregamento inicial
export async function prefetchLoginData() {
  try {
    console.log('🔄 Iniciando prefetch de parceiros e produtos...')

    // Chamar a API route de prefetch
    const response = await fetch('/api/prefetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Erro ao fazer prefetch: ${response.status}`)
    }

    const data = await response.json()

    // Armazenar dados no sessionStorage para uso offline
    if (data.parceirosData && Array.isArray(data.parceirosData)) {
      sessionStorage.setItem('cached_parceiros', JSON.stringify(data.parceirosData))
      console.log(`💾 ${data.parceirosData.length} parceiros armazenados no sessionStorage`)
    }

    if (data.produtosData && Array.isArray(data.produtosData)) {
      sessionStorage.setItem('cached_produtos', JSON.stringify(data.produtosData))
      console.log(`💾 ${data.produtosData.length} produtos armazenados no sessionStorage`)
    }

    console.log(`✅ Prefetch concluído - Parceiros: ${data.parceiros}, Produtos: ${data.produtos}`)

    return {
      parceiros: data.parceiros || 0,
      produtos: data.produtos || 0
    }
  } catch (error) {
    console.error('❌ Erro no prefetch de dados:', error)
    return {
      parceiros: 0,
      produtos: 0
    }
  }
}

// Limpar cache de prefetch (útil para forçar atualização)
export async function clearPrefetchCache() {
  try {
    // Chamar endpoint de limpeza de cache
    await fetch('/api/cache/clear', {
      method: 'POST',
    })
    console.log('🗑️ Cache de prefetch limpo')
  } catch (error) {
    console.error('❌ Erro ao limpar cache de prefetch:', error)
  }
}