/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, User, Hash, Image as ImageIcon, Play, RotateCcw, Save, Trash2, Gift, DollarSign, Grid, Lock, Eye, EyeOff, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Ganhador {
  numero: string;
  nome: string;
  id: number;
}

interface Reserva {
  numero: number;
  nome: string;
  telefone: string;
  id: number;
}

export default function App() {
  // Configuration State
  const [totalNumeros, setTotalNumeros] = useState<number>(100);
  const [brinde, setBrinde] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [imagemBase64, setImagemBase64] = useState<string>('');
  
  // Raffle State
  const [numeros, setNumeros] = useState<number[]>([]);
  const [sorteados, setSorteados] = useState<number[]>([]);
  const [ultimoSorteado, setUltimoSorteado] = useState<number | null>(null);
  const [isSorteioIniciado, setIsSorteioIniciado] = useState<boolean>(false);
  
  // Winners State
  const [ganhadores, setGanhadores] = useState<Ganhador[]>([]);
  const [numeroGanhador, setNumeroGanhador] = useState<string>('');
  const [nomeGanhador, setNomeGanhador] = useState<string>('');

  // Reservations State
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [numeroSelecionado, setNumeroSelecionado] = useState<number | null>(null);
  const [nomeReserva, setNomeReserva] = useState<string>('');
  const [telefoneReserva, setTelefoneReserva] = useState<string>('');
  
  // Admin Mode
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedGanhadores = localStorage.getItem('ganhadores');
    if (savedGanhadores) setGanhadores(JSON.parse(savedGanhadores));
    
    const savedImagem = localStorage.getItem('imagem');
    if (savedImagem) setImagemBase64(savedImagem);

    const savedReservas = localStorage.getItem('reservas');
    if (savedReservas) setReservas(JSON.parse(savedReservas));

    const savedTotal = localStorage.getItem('totalNumeros');
    if (savedTotal) {
      const total = parseInt(savedTotal);
      setTotalNumeros(total);
      setNumeros(Array.from({ length: total }, (_, i) => i + 1));
      setIsSorteioIniciado(true);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('ganhadores', JSON.stringify(ganhadores));
  }, [ganhadores]);

  useEffect(() => {
    localStorage.setItem('reservas', JSON.stringify(reservas));
  }, [reservas]);

  useEffect(() => {
    if (isSorteioIniciado) {
      localStorage.setItem('totalNumeros', totalNumeros.toString());
    }
  }, [totalNumeros, isSorteioIniciado]);

  const carregarImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setImagemBase64(base64);
      localStorage.setItem('imagem', base64);
    };
    reader.readAsDataURL(file);
  };

  const iniciarSorteio = () => {
    if (isNaN(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      alert("Escolha entre 10 e 500 números");
      return;
    }

    const novosNumeros = Array.from({ length: totalNumeros }, (_, i) => i + 1);
    setNumeros(novosNumeros);
    setSorteados([]);
    setUltimoSorteado(null);
    setIsSorteioIniciado(true);
  };

  const sortear = () => {
    if (!isSorteioIniciado) {
      alert("Inicie o sorteio primeiro!");
      return;
    }

    // Draw only from reserved numbers? Or any? 
    // User asked "only I can see the chosen numbers", implying we draw from the pool.
    // Let's draw from the reserved numbers if any exist, otherwise from all.
    const pool = reservas.length > 0 
      ? reservas.map(r => r.numero).filter(n => !sorteados.includes(n))
      : numeros.filter(n => !sorteados.includes(n));

    if (pool.length === 0) {
      alert("Todos os números disponíveis já foram sorteados!");
      return;
    }

    const num = pool[Math.floor(Math.random() * pool.length)];
    setSorteados(prev => [...prev, num]);
    setUltimoSorteado(num);

    // Auto-fill winner if reserved
    const reserva = reservas.find(r => r.numero === num);
    if (reserva) {
      setNumeroGanhador(num.toString());
      setNomeGanhador(reserva.nome);
    }
  };

  const registrarGanhador = () => {
    if (!numeroGanhador || !nomeGanhador) {
      alert("Preencha o número e o nome do ganhador");
      return;
    }

    const novoGanhador: Ganhador = {
      numero: numeroGanhador,
      nome: nomeGanhador,
      id: Date.now()
    };

    setGanhadores(prev => [novoGanhador, ...prev]);
    setNumeroGanhador('');
    setNomeGanhador('');
  };

  const reservarNumero = () => {
    if (!nomeReserva || !telefoneReserva || numeroSelecionado === null) {
      alert("Preencha seu nome e telefone");
      return;
    }

    const novaReserva: Reserva = {
      numero: numeroSelecionado,
      nome: nomeReserva,
      telefone: telefoneReserva,
      id: Date.now()
    };

    setReservas(prev => [...prev, novaReserva]);
    setNumeroSelecionado(null);
    setNomeReserva('');
    setTelefoneReserva('');
  };

  const cancelarReserva = (numero: number) => {
    if (window.confirm(`Cancelar reserva do número ${numero}?`)) {
      setReservas(prev => prev.filter(r => r.numero !== numero));
    }
  };

  const removerGanhador = (id: number) => {
    setGanhadores(prev => prev.filter(g => g.id !== id));
  };

  const limparTudo = () => {
    if (window.confirm("Tem certeza que deseja limpar todos os dados?")) {
      setGanhadores([]);
      setReservas([]);
      setImagemBase64('');
      setSorteados([]);
      setUltimoSorteado(null);
      setIsSorteioIniciado(false);
      localStorage.clear();
    }
  };

  const handleAdminLogin = () => {
    // Simple password for demo purposes. In a real app, use proper auth.
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert("Senha incorreta!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        {/* Header */}
        <header className="text-center mb-12 relative">
          <div className="absolute top-0 right-0">
            <button 
              onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)}
              className={`p-2 rounded-full transition-all ${isAdmin ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
              title={isAdmin ? "Sair do Modo Admin" : "Entrar no Modo Admin"}
            >
              {isAdmin ? <Eye className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </button>
          </div>

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-3 bg-emerald-500/10 rounded-2xl mb-4"
          >
            <Trophy className="w-12 h-12 text-emerald-500" />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Sorteio Inteligente</h1>
          <p className="text-slate-400">Escolha seu número e boa sorte!</p>
        </header>

        {/* Admin Login Modal */}
        <AnimatePresence>
          {showAdminLogin && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-6 text-emerald-500">
                  <Lock className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Acesso Administrativo</h2>
                </div>
                <p className="text-slate-400 text-sm mb-6">Apenas o organizador pode ver os dados dos participantes e configurar o sorteio.</p>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Digite a senha (admin123)"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowAdminLogin(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAdminLogin}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold transition-all"
                  >
                    Entrar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Public Grid & Draw */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Prize Card */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row gap-6 items-center">
              {imagemBase64 ? (
                <img 
                  src={imagemBase64} 
                  className="w-full md:w-48 h-48 object-cover rounded-2xl border border-slate-800 shadow-lg" 
                  alt="Prêmio"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full md:w-48 h-48 bg-slate-950 border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-700">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="flex-1 text-center md:text-left">
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-2 block">Grande Prêmio</span>
                <h2 className="text-3xl font-black mb-2">{brinde || 'Prêmio não definido'}</h2>
                {valor && <p className="text-2xl text-emerald-400 font-mono">R$ {valor}</p>}
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-xs text-slate-400">
                    {numeros.length} Números Totais
                  </span>
                  <span className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-xs text-emerald-500">
                    {reservas.length} Reservados
                  </span>
                </div>
              </div>
            </section>

            {/* Number Grid */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Grid className="w-6 h-6 text-emerald-500" />
                  <h2 className="text-xl font-bold">Escolha seu Número</h2>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-slate-950 border border-slate-800 rounded-sm"></div>
                    <span className="text-slate-500">Livre</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                    <span className="text-slate-500">Reservado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
                    <span className="text-slate-500">Sorteado</span>
                  </div>
                </div>
              </div>

              {!isSorteioIniciado ? (
                <div className="text-center py-20 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                  <p className="text-slate-500">O sorteio ainda não foi configurado pelo administrador.</p>
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {numeros.map(num => {
                    const reserva = reservas.find(r => r.numero === num);
                    const isSorteado = sorteados.includes(num);
                    
                    return (
                      <button
                        key={num}
                        disabled={!!reserva && !isAdmin}
                        onClick={() => {
                          if (isAdmin && reserva) {
                            cancelarReserva(num);
                          } else if (!reserva) {
                            setNumeroSelecionado(num);
                          }
                        }}
                        className={`
                          aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all relative group
                          ${isSorteado 
                            ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                            : reserva 
                              ? 'bg-emerald-600 text-white cursor-default' 
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-emerald-500 hover:text-emerald-400 active:scale-90'}
                          ${isAdmin && reserva ? 'hover:bg-red-500 hover:border-red-500 cursor-pointer' : ''}
                        `}
                      >
                        {num}
                        {isAdmin && reserva && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </div>
                        )}
                        {isAdmin && reserva && !isSorteado && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Admin Controls & Info */}
          <div className="space-y-8">
            
            {/* Admin Panel (Only visible if isAdmin) */}
            <AnimatePresence>
              {isAdmin && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <section className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-tighter rounded-bl-xl">Admin Mode</div>
                    
                    <div className="flex items-center gap-2 mb-6 text-emerald-500 font-semibold uppercase text-xs tracking-widest">
                      <Play className="w-4 h-4" />
                      Painel de Controle
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Total de Números (Max 500)</label>
                        <input 
                          type="number" 
                          value={isNaN(totalNumeros) ? '' : totalNumeros}
                          onChange={(e) => setTotalNumeros(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          value={brinde}
                          onChange={(e) => setBrinde(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-sm"
                          placeholder="Brinde"
                        />
                        <input 
                          type="number" 
                          value={valor}
                          onChange={(e) => setValor(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-sm"
                          placeholder="Valor R$"
                        />
                      </div>

                      <label className="flex items-center justify-center gap-2 bg-slate-950 border border-dashed border-slate-800 rounded-xl py-2 cursor-pointer hover:border-emerald-500/50 transition-colors">
                        <ImageIcon className="w-4 h-4 text-slate-500" />
                        <span className="text-xs text-slate-500">Trocar Imagem</span>
                        <input type="file" accept="image/*" onChange={carregarImagem} className="hidden" />
                      </label>

                      <button 
                        onClick={iniciarSorteio}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
                      >
                        {isSorteioIniciado ? 'Atualizar Configuração' : 'Iniciar Sorteio'}
                      </button>

                      <div className="pt-4 border-t border-slate-800">
                        <button 
                          onClick={sortear}
                          disabled={!isSorteioIniciado}
                          className="w-full bg-white text-slate-950 py-3 rounded-xl font-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-5 h-5" />
                          REALIZAR SORTEIO
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Reservations List (Admin Only) */}
                  <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-emerald-500 font-semibold uppercase text-xs tracking-widest">
                        <User className="w-4 h-4" />
                        Reservas ({reservas.length})
                      </div>
                      <button onClick={limparTudo} className="text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {reservas.length === 0 ? (
                        <p className="text-center py-8 text-slate-600 text-sm">Nenhuma reserva.</p>
                      ) : (
                        reservas.map(r => (
                          <div key={r.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-emerald-500 text-slate-950 rounded-lg flex items-center justify-center font-bold text-xs">
                                {r.numero}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-200">{r.nome}</h4>
                                <p className="text-[10px] text-slate-500">{r.telefone}</p>
                              </div>
                            </div>
                            <button onClick={() => cancelarReserva(r.numero)} className="text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Public Info / Draw Result */}
            {!isAdmin && (
              <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
                
                <h3 className="text-emerald-500 font-bold uppercase text-xs tracking-widest mb-6">Resultado do Sorteio</h3>
                
                <AnimatePresence mode="wait">
                  {ultimoSorteado ? (
                    <motion.div
                      key={ultimoSorteado}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="text-7xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                        {ultimoSorteado}
                      </div>
                      {reservas.find(r => r.numero === ultimoSorteado) && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                          <p className="text-emerald-500 font-bold text-xl">
                            {reservas.find(r => r.numero === ultimoSorteado)?.nome}
                          </p>
                          <p className="text-emerald-500/60 text-sm">Parabéns ao ganhador!</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="py-10">
                      <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-800" />
                      <p className="text-slate-500 text-sm">O sorteio será realizado em breve. Fique atento!</p>
                    </div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* Winners History */}
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-6 text-emerald-500 font-semibold uppercase text-xs tracking-widest">
                <Trophy className="w-4 h-4" />
                Histórico de Ganhadores
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {ganhadores.length === 0 ? (
                  <p className="text-center py-8 text-slate-600 text-sm">Nenhum ganhador ainda.</p>
                ) : (
                  ganhadores.map(g => (
                    <div key={g.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-bold text-xs">
                        {g.numero}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">{g.nome}</h4>
                        <p className="text-[10px] text-slate-500">{new Date(g.id).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

        </div>

        {/* Reservation Modal */}
        <AnimatePresence>
          {numeroSelecionado !== null && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3 text-emerald-500">
                    <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">
                      {numeroSelecionado}
                    </div>
                    <h2 className="text-xl font-bold">Reservar Número</h2>
                  </div>
                  <button onClick={() => setNumeroSelecionado(null)} className="text-slate-500 hover:text-white"><Trash2 className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Seu Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        value={nomeReserva}
                        onChange={(e) => setNomeReserva(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Nome"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Seu Telefone / WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="tel" 
                        value={telefoneReserva}
                        onChange={(e) => setTelefoneReserva(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={reservarNumero}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
                  >
                    CONFIRMAR RESERVA
                  </button>
                  <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest">Ao confirmar, o organizador entrará em contato.</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <footer className="mt-12 pt-8 border-t border-slate-900 text-center text-slate-600 text-sm">
          <p>&copy; {new Date().getFullYear()} Sorteio Inteligente • Desenvolvido com React & Tailwind</p>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
