import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from './lib/utils';
import { Button } from './components/ui/button';
import { Calendar } from './components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';

// Definir a interface para os dados
interface CommercialData {
  id: number;
  data_registro: string;
  nome_responsavel: string;
  nome_empresa: string;
  etapa_funil: 'Leads' | 'Contatos' | 'Reuniões' | 'Propostas' | 'Vendas';
}

// Componente principal do painel
function App() {
  const [_data, setData] = useState<CommercialData[]>([]);
  const [filteredData, setFilteredData] = useState<CommercialData[]>([]);
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2023, 0, 1), // Exemplo: 1 de janeiro de 2023
    to: addDays(new Date(2023, 0, 1), 365), // Exemplo: 1 ano de intervalo
  });

  // Efeito para buscar os dados da API backend
  useEffect(() => {
    const fetchData = async () => {
      if (date?.from && date?.to) {
        const startDate = format(date.from, 'yyyy-MM-dd');
        const endDate = format(date.to, 'yyyy-MM-dd');
        // O backend está rodando na porta 3000
        const response = await fetch(`http://localhost:3000/api/data?startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();
        setData(result);
        setFilteredData(result);
      }
    };

    fetchData();
  }, [date]);

  // Calcular as métricas do funil
  const leadsCount = filteredData.filter(d => d.etapa_funil === 'Leads').length;
  const contactsCount = filteredData.filter(d => d.etapa_funil === 'Contatos').length;
  const meetingsCount = filteredData.filter(d => d.etapa_funil === 'Reuniões').length;
  const proposalsCount = filteredData.filter(d => d.etapa_funil === 'Propostas').length;
  const salesCount = filteredData.filter(d => d.etapa_funil === 'Vendas').length;

  // Calcular as taxas de conversão
  const conversionRates = {
    leadsToContacts: leadsCount > 0 ? (contactsCount / leadsCount) * 100 : 0,
    contactsToMeetings: contactsCount > 0 ? (meetingsCount / contactsCount) * 100 : 0,
    meetingsToProposals: meetingsCount > 0 ? (proposalsCount / meetingsCount) * 100 : 0,
    proposalsToSales: proposalsCount > 0 ? (salesCount / proposalsCount) * 100 : 0,
  };

  // Dados para o gráfico de barras
  const chartData = [
    { name: 'Leads', value: leadsCount },
    { name: 'Contatos', value: contactsCount },
    { name: 'Reuniões', value: meetingsCount },
    { name: 'Propostas', value: proposalsCount },
    { name: 'Vendas', value: salesCount },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {/* O caminho da imagem deve ser ajustado para ser acessível pelo frontend */}
          <img src="/mirai-logo.png" alt="MirAI Logo" className="h-10 mr-4" />
          <h1 className="text-2xl font-bold">Painel Comercial</h1>
        </div>
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <MetricCard title="Leads" value={leadsCount} />
        <MetricCard title="Contatos" value={contactsCount} percentage={conversionRates.leadsToContacts} baseMetric="Leads" />
        <MetricCard title="Reuniões" value={meetingsCount} percentage={conversionRates.contactsToMeetings} baseMetric="Contatos" />
        <MetricCard title="Propostas" value={proposalsCount} percentage={conversionRates.meetingsToProposals} baseMetric="Reuniões" />
        <MetricCard title="Vendas" value={salesCount} percentage={conversionRates.proposalsToSales} baseMetric="Propostas" />
      </div>

      {/* Gráfico de Funil */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-xl font-bold mb-2">Funil de Vendas</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de Registros Recentes */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-2">Registros</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Data</th>
                <th className="py-2 px-4 border-b">Responsável</th>
                <th className="py-2 px-4 border-b">Empresa</th>
                <th className="py-2 px-4 border-b">Etapa do Funil</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record) => (
                <tr key={record.id}>
                  <td className="py-2 px-4 border-b">{record.data_registro}</td>
                  <td className="py-2 px-4 border-b">{record.nome_responsavel}</td>
                  <td className="py-2 px-4 border-b">{record.nome_empresa}</td>
                  <td className="py-2 px-4 border-b">{record.etapa_funil}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Componente para os cards de métrica
interface MetricCardProps {
  title: string;
  value: number;
  percentage?: number;
  baseMetric?: string;
}

function MetricCard({ title, value, percentage, baseMetric }: MetricCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
      {percentage !== undefined && (
        <p className="text-sm text-green-500">
          {percentage.toFixed(2)}% de {baseMetric}
        </p>
      )}
    </div>
  );
}

export default App;
