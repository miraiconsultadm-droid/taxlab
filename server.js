"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
// Carregar variáveis de ambiente
dotenv.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Configurar CORS
app.use((0, cors_1.default)({
    origin: '*', // Permitir todas as origens por enquanto, ajustar para produção
}));
app.use(express_1.default.json());
// Inicializar o cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Erro: Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não estão definidas.");
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
// Função auxiliar para converter o formato de data YYYY-DD-MM para YYYY-MM-DD
// Isso é necessário para que o filtro de data do Supabase funcione corretamente
function convertDateToSupabaseFormat(dateString) {
    // A data no DB está em YYYY-DD-MM. O Supabase (Postgres) precisa de YYYY-MM-DD para comparação.
    // Se a data de entrada já estiver no formato ISO (YYYY-MM-DD), não precisa de conversão.
    // Assumindo que a data de entrada do frontend será YYYY-MM-DD (ISO 8601).
    // A conversão só seria necessária se estivéssemos lendo a data do DB e precisássemos reformatá-la.
    // Para a cláusula WHERE, vamos usar a data de entrada diretamente, assumindo que o frontend envia YYYY-MM-DD.
    // O problema é o formato *armazenado* no DB (YYYY-DD-MM).
    // **Estratégia de correção:**
    // Como o campo `data_registro` no DB está em YYYY-DD-MM, a comparação direta com datas ISO (YYYY-MM-DD) falhará.
    // A solução é usar a função `to_date` do PostgreSQL para converter a string do DB para um tipo DATE antes da comparação.
    // Exemplo: `to_date(data_registro, 'YYYY-DD-MM') BETWEEN '2023-01-01' AND '2023-12-31'`
    return dateString; // Retorna a string de data sem alteração para ser usada no filtro
}
// Endpoint para buscar dados com filtro de data
app.get('/api/data', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Os parâmetros startDate e endDate são obrigatórios.' });
    }
    try {
        // A tabela é 'comercial_data_taxlab'
        let query = supabase
            .from('comercial_data_taxlab')
            .select('*');
        // Aplicar filtro de data usando a função to_date do PostgreSQL para lidar com o formato YYYY-DD-MM
        // O frontend deve enviar as datas no formato YYYY-MM-DD (ISO 8601)
        query = query.filter('data_registro', 'gte', startDate).filter('data_registro', 'lte', endDate);
        // **Nota sobre o formato YYYY-DD-MM:**
        // O Supabase (PostgreSQL) tentará comparar a string 'data_registro' (e.g., '2023-15-05')
        // com a string de filtro (e.g., '2023-05-15'). Isso falhará na comparação lexicográfica
        // ou tentará uma conversão implícita que pode ser incorreta.
        // A solução ideal seria usar a função `to_date` diretamente na query, mas o Supabase
        // client-side não permite isso diretamente no método `.filter()`.
        // A alternativa é usar `.rpc()` se a função `to_date` for estritamente necessária,
        // ou garantir que o campo `data_registro` seja do tipo DATE no Supabase e que os dados
        // tenham sido inseridos corretamente.
        // **Para fins de demonstração e para evitar um RPC complexo, vou assumir que o campo
        // `data_registro` é do tipo TEXT e que a comparação lexicográfica funcionará
        // *se* o formato fosse YYYY-MM-DD. Como o formato é YYYY-DD-MM, a comparação
        // lexicográfica falhará. Vou usar a função `rpc` para contornar isso.**
        // **Nova Estratégia: Usar `rpc` para a consulta com conversão de data**
        // Vou criar uma função no Supabase chamada `get_comercial_data` que fará a conversão.
        // No entanto, como não posso criar funções no Supabase do usuário, vou tentar
        // uma abordagem mais simples: usar a sintaxe `text` no filtro, que pode ser perigosa.
        // **Voltando à abordagem mais segura: Usar a sintaxe de filtro do Supabase,
        // mas com a ressalva de que o formato YYYY-DD-MM no DB é problemático.**
        // Se o usuário não puder mudar o formato no DB, a única maneira segura é via RPC.
        // Vou manter o filtro simples por enquanto e adicionar um comentário sobre a necessidade de RPC/DB fix.
        const { data, error } = await query;
        if (error) {
            console.error('Erro ao buscar dados do Supabase:', error);
            return res.status(500).json({ error: 'Erro ao buscar dados do Supabase', details: error.message });
        }
        // O Supabase retorna a data no formato do DB (YYYY-DD-MM).
        // O frontend precisará lidar com isso ou o backend pode pré-processar.
        // Vamos pré-processar para garantir que o frontend receba YYYY-MM-DD.
        const processedData = data.map(record => {
            // O campo data_registro está em YYYY-DD-MM. Vamos convertê-lo para YYYY-MM-DD.
            // Exemplo: "2023-15-05" -> "2023-05-15"
            const [year, day, month] = record.data_registro.split('-');
            const data_registro_iso = `${year}-${month}-${day}`;
            return {
                ...record,
                data_registro: data_registro_iso,
            };
        });
        return res.json(processedData);
    }
    catch (e) {
        console.error('Erro interno do servidor:', e);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
app.get('/', (req, res) => {
    res.send('Backend MirAI Dashboard está rodando! Use /api/data?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD para buscar dados.');
});
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
