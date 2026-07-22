
/* ==========================================================
    DBJS - MOTOR ADMINISTRADOR DE DADOS & JSLN SYNC
    Soberania Digital Industrial - JDP - v10.0
   ========================================================== */

const DBJS = (() => {
    const STORAGE_KEY = 'helena_cerebro_json';

    let JSLN_DATABASE = {
        produtos: [],
        transacoes: []
    };

    const dadosPadrao = {
        produtos: [
            { nome: "CARNE NA CHAPA", quantidade: 100, valor: 35.00, vendas: 0 },
            { nome: "HAMBURGUER", quantidade: 100, valor: 25.00, vendas: 0 }
        ],
        transacoes: []
    };

    function sincronizarComServiceWorker() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SYNC_DATABASE',
                data: JSLN_DATABASE
            });
        }
    }

    return {
        async init() {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    JSLN_DATABASE = JSON.parse(stored);
                    if (!JSLN_DATABASE.produtos) JSLN_DATABASE.produtos = [];
                    if (!JSLN_DATABASE.transacoes) JSLN_DATABASE.transacoes = [];
                } catch (e) {
                    JSLN_DATABASE = JSON.parse(JSON.stringify(dadosPadrao));
                }
            } else {
                JSLN_DATABASE = JSON.parse(JSON.stringify(dadosPadrao));
                this.salvar();
            }
            return JSLN_DATABASE;
        },

        salvar() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(JSLN_DATABASE, null, 2));
            sincronizarComServiceWorker();
        },

        getData() {
            return JSLN_DATABASE;
        },

        cadastrarOuAtualizarProduto(nome, quantidade, valor) {
            const nomeFormatado = nome.toUpperCase().trim();
            const existente = JSLN_DATABASE.produtos.find(p => p.nome === nomeFormatado);
            if (existente) {
                existente.quantidade += quantidade;
                existente.valor = valor;
                this.salvar();
                return { status: 'atualizado', mensagem: `Estoque de ${nomeFormatado} atualizado para ${existente.quantidade} unidades.` };
            } else {
                JSLN_DATABASE.produtos.push({ nome: nomeFormatado, quantidade, valor, vendas: 0 });
                this.salvar();
                return { status: 'criado', mensagem: `${nomeFormatado} integrado ao estoque.` };
            }
        },

        removerProduto(index) {
            JSLN_DATABASE.produtos.splice(index, 1);
            this.salvar();
        },

        processarVenda(prodBuscado, metodo) {
            const termo = prodBuscado.toUpperCase().trim();
            const produto = JSLN_DATABASE.produtos.find(p => p.nome === termo || p.nome.includes(termo));

            if (!produto) {
                return { sucesso: false, tipo: 'NAO_ENCONTRADO' };
            }

            if (produto.quantidade < 1) {
                return { sucesso: false, tipo: 'ESGOTADO', produto: produto.nome };
            }

            produto.quantidade -= 1;
            produto.vendas += 1;

            const agora = new Date();
            const dataStr = agora.toLocaleDateString('pt-BR');
            const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const transacao = {
                produto: produto.nome,
                quantidade: 1,
                valorTotal: produto.valor,
                metodoPagamento: metodo.toUpperCase(),
                data: dataStr,
                hora: horaStr
            };

            JSLN_DATABASE.transacoes.push(transacao);
            this.salvar();

            return { sucesso: true, transacao, produto };
        },

        // INJETA A TRANSAÇÃO GERADA PELA MÁQUINA V46 DIRETAMENTE NO FATURAMENTO
        registrarVendaPOS(valor) {
            const agora = new Date();
            const dataStr = agora.toLocaleDateString('pt-BR');
            const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const transacao = {
                produto: "VENDA AVULSA MÁQUINA POS",
                quantidade: 1,
                valorTotal: parseFloat(valor),
                metodoPagamento: "PIX",
                data: dataStr,
                hora: horaStr
            };

            JSLN_DATABASE.transacoes.push(transacao);
            this.salvar();
        },

        calcularFaturamento() {
            let total = 0;
            let totalPix = 0;
            let totalCaixa = 0;

            JSLN_DATABASE.transacoes.forEach(t => {
                total += t.valorTotal;
                if (t.metodoPagamento === "PIX") totalPix += t.valorTotal;
                else totalCaixa += t.valorTotal;
            });

            return { total, totalPix, totalCaixa };
        },

        exportarJSON() {
            const fileData = JSON.stringify(JSLN_DATABASE, null, 2);
            const blob = new Blob([fileData], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "cerebro.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        importarJSON(jsonString) {
            try {
                const parsed = JSON.parse(jsonString);
                if (parsed.produtos && parsed.transacoes) {
                    JSLN_DATABASE = parsed;
                    this.salvar();
                    return true;
                }
                return false;
            } catch (e) {
                return false;
            }
        },

        limparBanco() {
            JSLN_DATABASE = { produtos: [], transacoes: [] };
            this.salvar();
        }
    };
})();
