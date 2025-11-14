import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

// Configuração do Supabase (Usando variáveis de ambiente para o deploy)
const supabaseUrl = process.env.SUPABASE_URL || 'https://vwkzrcfewxekcowbhvzf.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a3pyY2Zld3hla2Nvd2JodnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTIxNjMsImV4cCI6MjA3NTc4ODE2M30.gnAGQo2oLjLY2kOiqA16vOPUK-3SjgAmzqlT5wDrnaw';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = process.env.PORT || 3001;

// Configuração do CORS para permitir acesso do frontend
app.use(cors({
  origin: '*', // Permitir acesso de qualquer origem (ajustar em produção)
  methods: ['GET'],
}));

// Documentação da API com Swagger
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rota de saúde
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('Backend is running');
});

// Rota para buscar dados comerciais
app.get('/api/comercial-data', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('comercial_data_taxlab')
      .select('*')
      .order('data_registro', { ascending: false });

    if (error) {
      console.error('Supabase Error:', error);
      return res.status(500).json({ error: 'Erro ao buscar dados do Supabase', details: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
