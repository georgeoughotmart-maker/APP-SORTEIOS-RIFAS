/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Trophy, User, Hash, Image as ImageIcon, Play, RotateCcw, Save, Trash2, Gift, DollarSign, Grid, Lock, Eye, EyeOff, Phone, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  doc, collection, onSnapshot, setDoc, addDoc, deleteDoc, query, orderBy,
  OperationType, handleFirestoreError 
} from './firebase';

interface Ganhador {
  numero: string;
  nome: string;
  id: string;
  timestamp: number;
}

interface Reserva {
  numero: number;
  nome: string;
  telefone: string;
  id: string;
}

export default function App() {
  return <RaffleApp />;
}

function RaffleApp() {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration State
  const [totalNumeros, setTotalNumeros] = useState<number>(100);
  const [brinde, setBrinde] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [imagemBase64, setImagemBase64] = useState<string>('');
  
  // Raffle State
  const [numeros, setNumeros] = useState<number[]>([]);
  const [sorteados, setSorteados] = useState<number[]>([]);
  const [takenNumbers, setTakenNumbers] = useState<number[]>([]);
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
  
  // Admin Login UI
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      // Check if user is the admin email provided in context
      if (user && user.email === 'georgeoughotmart@gmail.com' && user.emailVerified) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!isAuthReady) return;

    // 1. Raffle Config
    const unsubConfig = onSnapshot(doc(db, 'raffle', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTotalNumeros(data.totalNumeros || 100);
        setBrinde(data.brinde || '');
        setValor(data.valor || '');
        setImagemBase64(data.imagemBase64 || '');
        setIsSorteioIniciado(data.isSorteioIniciado || false);
        
        if (data.isSorteioIniciado) {
          setNumeros(Array.from({ length: data.totalNumeros }, (_, i) => i + 1));
        }
      }
    }, (err) => {
      try { handleFirestoreError(err, OperationType.GET, 'raffle/config'); }
      catch (e: any) { setError(JSON.parse(e.message).error); }
    });

    // 2. Raffle State
    const unsubState = onSnapshot(doc(db, 'raffle', 'state'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSorteados(data.sorteados || []);
        setTakenNumbers(data.takenNumbers || []);
        setUltimoSorteado(data.ultimoSorteado || null);
      }
    }, (err) => {
      try { handleFirestoreError(err, OperationType.GET, 'raffle/state'); }
      catch (e: any) { setError(JSON.parse(e.message).error); }
    });

    // 3. Reservations (Admin Only)
    let unsubReservas = () => {};
    if (isAdmin) {
      unsubReservas = onSnapshot(collection(db, 'reservas'), (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reserva));
        setReservas(docs);
      }, (err) => {
        try { handleFirestoreError(err, OperationType.GET, 'reservas'); }
        catch (e: any) { setError(JSON.parse(e.message).error); }
      });
    } else {
      setReservas([]); // Clear for non-admins
    }

    // 4. Winners
    const q = query(collection(db, 'ganhadores'), orderBy('timestamp', 'desc'));
    const unsubGanhadores = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ganhador));
      setGanhadores(docs);
    }, (err) => {
      try { handleFirestoreError(err, OperationType.GET, 'ganhadores'); }
      catch (e: any) { setError(JSON.parse(e.message).error); }
    });

    return () => {
      unsubConfig();
      unsubState();
      unsubReservas();
      unsubGanhadores();
    };
  }, [isAuthReady]);

  const carregarImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      setImagemBase64(base64);
      if (isAdmin) {
        try {
          await setDoc(doc(db, 'raffle', 'config'), { imagemBase64: base64 }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'raffle/config');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const iniciarSorteio = async () => {
    if (!isAdmin) return;
    if (isNaN(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      alert("Escolha entre 10 e 500 números");
      return;
    }

    try {
      await setDoc(doc(db, 'raffle', 'config'), {
        totalNumeros,
        brinde,
        valor,
        imagemBase64,
        isSorteioIniciado: true
      });
      // Reset state on new raffle
      await setDoc(doc(db, 'raffle', 'state'), {
        sorteados: [],
        ultimoSorteado: null,
        takenNumbers: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'raffle/config');
    }
  };

  const sortear = async () => {
    if (!isAdmin || !isSorteioIniciado) return;

    const pool = reservas.length > 0 
      ? reservas.map(r => r.numero).filter(n => !sorteados.includes(n))
      : numeros.filter(n => !sorteados.includes(n));

    if (pool.length === 0) {
      alert("Todos os números disponíveis já foram sorteados!");
      return;
    }

    const num = pool[Math.floor(Math.random() * pool.length)];
    const novosSorteados = [...sorteados, num];

    try {
      await setDoc(doc(db, 'raffle', 'state'), {
        sorteados: novosSorteados,
        ultimoSorteado: num
      });

      // Auto-fill winner if reserved
      const reserva = reservas.find(r => r.numero === num);
      if (reserva) {
        setNumeroGanhador(num.toString());
        setNomeGanhador(reserva.nome);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'raffle/state');
    }
  };

  const registrarGanhador = async () => {
    if (!isAdmin || !numeroGanhador || !nomeGanhador) {
      alert("Preencha o número e o nome do ganhador");
      return;
    }

    try {
      await addDoc(collection(db, 'ganhadores'), {
        numero: numeroGanhador,
        nome: nomeGanhador,
        timestamp: Date.now()
      });
      setNumeroGanhador('');
      setNomeGanhador('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ganhadores');
    }
  };

  const reservarNumero = async () => {
    if (!nomeReserva || !telefoneReserva || numeroSelecionado === null) {
      alert("Preencha seu nome e telefone");
      return;
    }

    try {
      await addDoc(collection(db, 'reservas'), {
        numero: numeroSelecionado,
        nome: nomeReserva,
        telefone: telefoneReserva,
        timestamp: Date.now()
      });
      
      // Update takenNumbers in raffle/state
      const novosTaken = [...takenNumbers, numeroSelecionado];
      await setDoc(doc(db, 'raffle', 'state'), { takenNumbers: novosTaken }, { merge: true });

      setNumeroSelecionado(null);
      setNomeReserva('');
      setTelefoneReserva('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservas');
    }
  };

  const cancelarReserva = async (numero: number) => {
    if (!isAdmin) return;
    const reserva = reservas.find(r => r.numero === numero);
    if (!reserva) return;

    if (window.confirm(`Cancelar reserva do número ${numero}?`)) {
      try {
        await deleteDoc(doc(db, 'reservas', reserva.id));
        
        // Update takenNumbers in raffle/state
        const novosTaken = takenNumbers.filter(n => n !== numero);
        await setDoc(doc(db, 'raffle', 'state'), { takenNumbers: novosTaken }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `reservas/${reserva.id}`);
      }
    }
  };

  const removerGanhador = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'ganhadores', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ganhadores/${id}`);
    }
  };

  const limparTudo = async () => {
    if (!isAdmin) return;
    if (window.confirm("Tem certeza que deseja limpar todos os dados?")) {
      try {
        // Reset config and state
        await setDoc(doc(db, 'raffle', 'config'), {
          totalNumeros: 100,
          brinde: '',
          valor: '',
          imagemBase64: '',
          isSorteioIniciado: false
        });
        await setDoc(doc(db, 'raffle', 'state'), {
          sorteados: [],
          ultimoSorteado: null,
          takenNumbers: []
        });

        // Delete all reservations and winners (manual loop as Firestore doesn't have delete collection)
        for (const r of reservas) {
          await deleteDoc(doc(db, 'reservas', r.id));
        }
        for (const g of ganhadores) {
          await deleteDoc(doc(db, 'ganhadores', g.id));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'raffle/cleanup');
      }
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAdminLogin(false);
    } catch (error) {
      alert("Erro ao fazer login: " + (error as Error).message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
    } catch (error) {
      alert("Erro ao sair: " + (error as Error).message);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Global Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white py-3 px-6 flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">Erro: {error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-full transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-12">
        
        {/* Header */}
        <header className="text-center mb-12 relative">
          <div className="absolute top-0 right-0 flex gap-2">
            {user ? (
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full bg-slate-900 text-slate-500 hover:text-red-400 transition-all"
                title="Sair"
              >
                <LogOut className="w-6 h-6" />
              </button>
            ) : (
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="p-2 rounded-full bg-slate-900 text-slate-500 hover:text-emerald-400 transition-all"
                title="Entrar como Admin"
              >
                <LogIn className="w-6 h-6" />
              </button>
            )}
            {isAdmin && (
              <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-500" title="Modo Admin Ativo">
                <Eye className="w-6 h-6" />
              </div>
            )}
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
          {user && !isAdmin && (
            <p className="text-xs text-slate-600 mt-2">Logado como: {user.email}</p>
          )}
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
                <p className="text-slate-400 text-sm mb-6">Apenas o organizador (georgeoughotmart@gmail.com) pode configurar o sorteio e ver os dados dos participantes.</p>
                
                <button 
                  onClick={handleLogin}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 mb-4"
                >
                  <LogIn className="w-5 h-5" />
                  Entrar com Google
                </button>

                <button 
                  onClick={() => setShowAdminLogin(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
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
                    {takenNumbers.length} Reservados
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
                    const isTaken = takenNumbers.includes(num);
                    const isSorteado = sorteados.includes(num);
                    
                    return (
                      <button
                        key={num}
                        disabled={isTaken && !isAdmin}
                        onClick={() => {
                          if (isAdmin && isTaken) {
                            cancelarReserva(num);
                          } else if (!isTaken) {
                            setNumeroSelecionado(num);
                          }
                        }}
                        className={`
                          aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold transition-all relative group
                          ${isSorteado 
                            ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                            : isTaken 
                              ? 'bg-emerald-600 text-white cursor-default' 
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-emerald-500 hover:text-emerald-400 active:scale-90'}
                          ${isAdmin && isTaken ? 'hover:bg-red-500 hover:border-red-500 cursor-pointer' : ''}
                        `}
                      >
                        {num}
                        {isAdmin && isTaken && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </div>
                        )}
                        {isAdmin && isTaken && !isSorteado && (
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
                      {takenNumbers.includes(ultimoSorteado) && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                          <p className="text-emerald-500 font-bold text-xl">
                            Número Reservado!
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
                    <div key={g.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-bold text-xs">
                          {g.numero}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">{g.nome}</h4>
                          <p className="text-[10px] text-slate-500">{new Date(g.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => removerGanhador(g.id)} className="text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
