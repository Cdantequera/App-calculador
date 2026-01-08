import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import Swal from 'sweetalert2';
import 'react-calendar/dist/Calendar.css';
import './App.css';

// CONFIGURACIÓN: Hora de corte (4 AM)
const DAY_CUTOFF_HOUR = 4; 

function App() {
  
  // --- 1. LÓGICA DE FECHA INICIAL ---
  const getInitialDate = () => {
    const now = new Date();
    if (now.getHours() < DAY_CUTOFF_HOUR) {
      now.setDate(now.getDate() - 1);
    }
    return now;
  };

  const [date, setDate] = useState(getInitialDate());
  const [currentScreen, setCurrentScreen] = useState('home');
  const [summaryView, setSummaryView] = useState('week'); 
  
  // ESTADO PARA LA INSTALACIÓN (NUEVO)
  const [installPrompt, setInstallPrompt] = useState(null);

  // --- 2. ESTADO PARA LOS DATOS ---
  const [dailyData, setDailyData] = useState(() => {
    const saved = localStorage.getItem('gananciasApp');
    return saved ? JSON.parse(saved) : {};
  });

  const [inputCash, setInputCash] = useState('');
  const [inputExpense, setInputExpense] = useState('');

  useEffect(() => {
    localStorage.setItem('gananciasApp', JSON.stringify(dailyData));
  }, [dailyData]);

  // --- 3. LÓGICA DE INSTALACIÓN PWA (BOTÓN MANUAL) ---
  useEffect(() => {
    const handler = (e) => {
      // Prevenir que Chrome muestre su barra nativa automáticamente
      e.preventDefault();
      // Guardar el evento para usarlo cuando hagamos clic en el botón
      setInstallPrompt(e);
      console.log("Evento de instalación capturado!");
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Función para instalar al hacer clic
  const handleInstallClick = () => {
    if (!installPrompt) return;

    // Mostrar la pregunta nativa
    installPrompt.prompt();

    // Ver qué decidió el usuario
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuario aceptó instalar');
      }
      // Ya usamos el evento, lo limpiamos y el botón desaparecerá
      setInstallPrompt(null);
    });
  };

  const onChangeDate = (newDate) => {
    setDate(newDate);
  };

  const getDateKey = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- 4. CÁLCULOS ---
  const getWeekRange = (baseDate) => {
    const start = new Date(baseDate);
    const day = start.getDay(); 
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const calculateWeeklyStats = () => {
    const { start } = getWeekRange(date); 
    let totalIncome = 0;
    let totalExpense = 0;
    let daysWithData = 0;
    for (let i = 0; i < 7; i++) {
      const loopDate = new Date(start);
      loopDate.setDate(start.getDate() + i);
      const key = getDateKey(loopDate);
      if (dailyData[key]) {
        totalIncome += dailyData[key].income;
        totalExpense += dailyData[key].expenses;
        if(dailyData[key].income > 0 || dailyData[key].expenses > 0) daysWithData++;
      }
    }
    return { totalIncome, totalExpense, net: totalIncome - totalExpense, startDate: start, daysWorked: daysWithData };
  };

  const calculateMonthlyStats = () => {
    const year = date.getFullYear();
    const monthIndex = date.getMonth(); 
    const monthKey = String(monthIndex + 1).padStart(2, '0'); 
    const prefix = `${year}-${monthKey}`; 
    let totalIncome = 0;
    let totalExpense = 0;
    let daysWithData = 0;
    Object.keys(dailyData).forEach(key => {
        if (key.startsWith(prefix)) {
            totalIncome += dailyData[key].income;
            totalExpense += dailyData[key].expenses;
            if(dailyData[key].income > 0 || dailyData[key].expenses > 0) daysWithData++;
        }
    });
    return { totalIncome, totalExpense, net: totalIncome - totalExpense, daysWorked: daysWithData };
  };

  // --- 5. FUNCIONES DE INTERFAZ ---
  const handlePreSave = () => {
    const cashVal = parseFloat(inputCash) || 0;
    const expenseVal = parseFloat(inputExpense) || 0;

    if (cashVal === 0 && expenseVal === 0) {
      Swal.fire({ icon: 'warning', title: 'Campos vacíos', background: '#1e293b', color: '#fff' });
      return;
    }

    Swal.fire({
      title: '¿Confirmar carga?',
      html: `
        <div style="text-align:left; color:#cbd5e1;">
          ${cashVal > 0 ? `<p>💰 Ingreso: <b style="color:#4ade80">$${cashVal}</b></p>` : ''}
          ${expenseVal > 0 ? `<p>🔻 Gasto: <b style="color:#f87171">$${expenseVal}</b></p>` : ''}
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Guardar',
      background: '#0f172a',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) saveData(cashVal, expenseVal);
    });
  };

  const saveData = (cashVal, expenseVal) => {
    const dateKey = getDateKey(date);
    setDailyData(prev => {
      const currentDayData = prev[dateKey] || { income: 0, expenses: 0, history: [] };
      const newIncome = currentDayData.income + cashVal;
      const newExpenses = currentDayData.expenses + expenseVal;
      const newHistory = [
        ...currentDayData.history,
        {
          id: Date.now(),
          incomeAmount: cashVal,
          expenseAmount: expenseVal,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ];
      return { ...prev, [dateKey]: { income: newIncome, expenses: newExpenses, history: newHistory } };
    });
    setInputCash('');
    setInputExpense('');
    setCurrentScreen('home');
    Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#1e293b', color: '#fff' }).fire({ icon: 'success', title: 'Guardado' });
  };

  const handleDeleteItem = (itemId) => {
    const dateKey = getDateKey(date);
    const itemToDelete = dailyData[dateKey].history.find(i => i.id === itemId);

    Swal.fire({
        title: '¿Borrar registro?',
        text: `Se eliminará la carga de las ${itemToDelete.time}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        background: '#0f172a',
        color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            setDailyData(prev => {
                const dayData = prev[dateKey];
                const newHistory = dayData.history.filter(item => item.id !== itemId);
                const newIncome = newHistory.reduce((acc, item) => acc + item.incomeAmount, 0);
                const newExpenses = newHistory.reduce((acc, item) => acc + item.expenseAmount, 0);
                return { ...prev, [dateKey]: { income: newIncome, expenses: newExpenses, history: newHistory } };
            });
            Swal.mixin({ toast: true, position: 'top-end', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff' }).fire({ icon: 'success', title: 'Borrado' });
        }
    });
  };

  const selectedDateKey = getDateKey(date);
  const dayData = dailyData[selectedDateKey] || { income: 0, expenses: 0, history: [] };
  const dayNet = dayData.income - dayData.expenses;
  const stats = currentScreen === 'resumen' 
    ? (summaryView === 'week' ? calculateWeeklyStats() : calculateMonthlyStats()) 
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 font-sans">
      
      {/* --- HEADER --- */}
      <header className="w-full max-w-md text-center py-6 mb-4 relative">
        {currentScreen !== 'home' && (
          <button 
            onClick={() => setCurrentScreen('home')}
            className="absolute left-0 top-6 text-slate-400 hover:text-white text-xl p-2"
          >
            ← Volver
          </button>
        )}
        <h1 className="text-2xl font-bold tracking-wide uppercase text-slate-100 drop-shadow-md flex items-center justify-center gap-3">
            <i className="fi fi-ss-coins text-yellow-400 text-3xl"></i>
            Calculador
        </h1>
        {new Date().getHours() < DAY_CUTOFF_HOUR && (
            <span className="text-xs text-yellow-500 font-mono block mt-1">🌙 Modo Nocturno (Ayer)</span>
        )}

        {/* --- BOTÓN DE INSTALAR APP (Solo visible si es posible instalar) --- */}
        {installPrompt && (
          <button 
            onClick={handleInstallClick}
            className="mt-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse"
          >
            📲 Instalar App en Celular
          </button>
        )}

      </header>

      {/* --- PANTALLA PRINCIPAL (HOME) --- */}
      {currentScreen === 'home' && (
        <>
          <div className="w-full max-w-md bg-slate-900 rounded-2xl p-4 shadow-lg border border-slate-800 mb-6 flex flex-col items-center justify-center relative">
            <div className={`absolute top-0 left-0 w-full h-2 rounded-t-2xl ${dayNet >= 0 ? 'bg-blue-600' : 'bg-red-600'}`}></div>
            <div className="mt-4 w-full">
               <Calendar onChange={onChangeDate} value={date} locale="es-ES" />
            </div>
            
            <div className="mt-4 w-full flex justify-between text-sm px-2 border-t border-slate-800 pt-3">
                <div className="text-center">
                    <p className="text-slate-500">Ingreso</p>
                    <p className="text-green-400 font-bold text-lg">${dayData.income}</p>
                </div>
                <div className="text-center">
                    <p className="text-slate-500">Gastos</p>
                    <p className="text-red-400 font-bold text-lg">${dayData.expenses}</p>
                </div>
                <div className="text-center">
                    <p className="text-slate-500">Neto</p>
                    <p className={`font-bold text-lg ${dayNet >= 0 ? 'text-blue-400' : 'text-red-500'}`}>${dayNet}</p>
                </div>
            </div>
          </div>

          <div className="w-full max-w-md mb-6">
            <h3 className="text-slate-400 text-sm mb-2 uppercase font-bold tracking-wider">Movimientos del día</h3>
            {dayData.history && dayData.history.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {[...dayData.history].reverse().map((item) => (
                        <div key={item.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-xs font-mono">{item.time}</span>
                                <div className="flex gap-2 text-sm">
                                    {item.incomeAmount > 0 && <span className="text-green-400">+ ${item.incomeAmount}</span>}
                                    {item.expenseAmount > 0 && <span className="text-red-400">- ${item.expenseAmount}</span>}
                                </div>
                            </div>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-400">🗑️</button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-600">No hay movimientos hoy</div>
            )}
          </div>

          <div className="w-full max-w-md flex flex-col gap-4 mb-6">
            <button 
              onClick={() => setCurrentScreen('cargar')}
              className="w-full py-4 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 rounded-xl text-xl font-bold shadow-lg border-b-4 border-green-900 flex items-center justify-center"
            >
              <span className="mr-2">💰</span> Cargar Movimiento
            </button>
            
             <button 
              onClick={() => setCurrentScreen('resumen')}
              className="w-full py-4 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 rounded-xl text-xl font-bold shadow-lg border-b-4 border-blue-900 flex items-center justify-center"
            >
              <span className="mr-2">📊</span> Resumen / Estadísticas
            </button>
          </div>
        </>
      )}

      {/* --- PANTALLA RESUMEN --- */}
      {currentScreen === 'resumen' && stats && (
        <div className="w-full max-w-md animate-fade-in-up">
            <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-800">
                <button 
                    onClick={() => setSummaryView('week')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${summaryView === 'week' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Semanal
                </button>
                <button 
                    onClick={() => setSummaryView('month')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${summaryView === 'month' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Mensual
                </button>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 mb-4 text-center border border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                    {summaryView === 'week' ? 'Rango Semanal' : 'Mes Completo'}
                </p>
                <h2 className="text-xl font-bold text-white capitalize">
                    {summaryView === 'week' ? (
                        <>
                            {stats.startDate.toLocaleDateString(undefined, {day:'numeric', month:'short'})} 
                            <span className="text-slate-500 mx-2"> al </span>
                            {new Date(stats.startDate.getTime() + 6*24*60*60*1000).toLocaleDateString(undefined, {day:'numeric', month:'short'})}
                        </>
                    ) : (
                        date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
                    )}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Días trabajados: {stats.daysWorked}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center">
                    <span className="text-3xl mb-2">💵</span>
                    <span className="text-slate-400 text-sm">Ingresos</span>
                    <span className="text-green-400 text-2xl font-bold mt-1">${stats.totalIncome}</span>
                </div>
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col items-center">
                    <span className="text-3xl mb-2">💸</span>
                    <span className="text-slate-400 text-sm">Gastos</span>
                    <span className="text-red-400 text-2xl font-bold mt-1">${stats.totalExpense}</span>
                </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl text-center mb-6 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stats.net >= 0 ? 'from-blue-500 to-green-500' : 'from-red-500 to-orange-500'}`}></div>
                <h3 className="text-slate-300 text-lg uppercase tracking-widest mb-2">
                    Ganancia {summaryView === 'week' ? 'Semanal' : 'Mensual'}
                </h3>
                <p className={`text-4xl font-bold ${stats.net >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                    ${stats.net}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                    {summaryView === 'week' ? 'Total limpio esta semana' : 'Total acumulado este mes'}
                </p>
            </div>
        </div>
      )}

      {/* --- PANTALLA DE CARGA --- */}
      {currentScreen === 'cargar' && (
        <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in-up">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h2 className="text-xl text-center mb-6 text-slate-300">
              Cargar en <span className="text-green-400 font-bold">{date.toLocaleDateString()}</span>
            </h2>
            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-2 font-bold ml-1">Ingreso (Efectivo)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">$</span>
                <input type="number" value={inputCash} onChange={(e) => setInputCash(e.target.value)} placeholder="0" className="w-full bg-slate-800 text-white text-lg p-3 pl-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 border border-slate-700" />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-slate-400 text-sm mb-2 font-bold ml-1">Gastos / Retiros</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">🔻</span>
                <input type="number" value={inputExpense} onChange={(e) => setInputExpense(e.target.value)} placeholder="0" className="w-full bg-slate-800 text-white text-lg p-3 pl-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 border border-slate-700" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCurrentScreen('home')} className="flex-1 py-4 bg-transparent border-2 border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl text-lg font-bold">Cancelar</button>
              <button onClick={handlePreSave} className="flex-1 py-4 bg-slate-100 text-slate-900 hover:bg-white rounded-xl text-lg font-bold border-b-4 border-slate-400">SEND</button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto w-full max-w-md bg-slate-900 rounded-xl border border-slate-800 p-4 text-center mb-2">
        <p className="text-slate-500 text-sm">Creado por Daniel Antequera</p>
      </footer>
    </div>
  );
}

export default App;