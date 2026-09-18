import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Guest } from '../types/guest';
import { Users, UserCheck, Clock, Baby, LayoutDashboard, CheckCircle2, FileDown, Trash2, AlertTriangle, X, UserMinus, Search, Plus } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Admin() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [abaMobile, setAbaMobile] = useState<'dashboard' | 'lista'>('dashboard');

  // ESTADOS DOS MODAIS
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: 'family', guestId: '', nomeFamilia: '', personType: 'adultos' as 'adultos'|'criancas', personIndex: -1, personName: '' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', isError: false });
  
  // MODAL DE ADIÇÃO MANUAL
  const [manualAddModal, setManualAddModal] = useState(false);
  const [manualData, setManualData] = useState({ nomeFamilia: '', adultosText: '', criancasText: '' });

  const fetchGuests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'guests'));
      const guestsData = querySnapshot.docs.map(document => ({ id: document.id, ...document.data() })) as Guest[];
      setGuests(guestsData);
    } catch (error) {
      console.error("Erro ao buscar:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuests(); }, []);

  // EXCLUSÃO
  const executeDelete = async () => {
    const { type, guestId, personType, personIndex } = deleteModal;
    try {
      if (type === 'family') {
        await deleteDoc(doc(db, 'guests', guestId));
        setGuests(guests.filter(g => g.id !== guestId));
        setAlertModal({ isOpen: true, message: "Família excluída com sucesso!", isError: false });
      } else {
        const guestTarget = guests.find(g => g.id === guestId);
        if (guestTarget) {
          const updatedList = [...(guestTarget[personType] || [])];
          updatedList.splice(personIndex, 1);
          await updateDoc(doc(db, 'guests', guestId), { [personType]: updatedList });
          setGuests(guests.map(g => g.id === guestId ? { ...g, [personType]: updatedList } : g));
        }
      }
    } catch (error) {
      setAlertModal({ isOpen: true, message: "Erro ao tentar remover.", isError: true });
    } finally {
      setDeleteModal({ ...deleteModal, isOpen: false });
    }
  };

  // ADIÇÃO MANUAL
  const executeManualAdd = async () => {
    if (!manualData.nomeFamilia) return;
    
    // Transforma a string separada por vírgulas em Array
    const adultosArray = manualData.adultosText.split(',').map(n => n.trim()).filter(n => n !== '');
    const criancasArray = manualData.criancasText.split(',').map(n => n.trim()).filter(n => n !== '');

    if (adultosArray.length === 0) {
      setAlertModal({ isOpen: true, message: "Insira ao menos um adulto.", isError: true });
      return;
    }

    try {
      const newGuest = {
        nomeFamilia: manualData.nomeFamilia,
        adultos: adultosArray,
        criancas: criancasArray,
        status: 'confirmado' as const,
        data_confirmacao: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'guests'), newGuest);
      setGuests([{ id: docRef.id, ...newGuest }, ...guests]);
      setManualAddModal(false);
      setManualData({ nomeFamilia: '', adultosText: '', criancasText: '' });
      setAlertModal({ isOpen: true, message: "Convidado adicionado manualmente com sucesso!", isError: false });
    } catch (error) {
      setAlertModal({ isOpen: true, message: "Erro ao salvar no banco.", isError: true });
    }
  };

  // KPIs e Filtros
  const confirmados = guests.filter(g => g.status === 'confirmado');
  const totalAdultos = confirmados.reduce((acc, curr) => acc + (curr.adultos?.length || 0), 0);
  const totalCriancas = confirmados.reduce((acc, curr) => acc + (curr.criancas?.length || 0), 0);
  const totalGeral = totalAdultos + totalCriancas;

  const filteredGuests = guests.filter(g => 
    g.nomeFamilia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.adultos?.some(a => a.toLowerCase().includes(searchTerm.toLowerCase())) ||
    g.criancas?.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const gerarPDFBuffet = () => {
    if (confirmados.length === 0) return setAlertModal({ isOpen: true, message: "Lista vazia.", isError: true });
    const docPdf = new jsPDF();
    docPdf.setFontSize(18);
    docPdf.setTextColor(218, 91, 91); 
    docPdf.text('Lista Oficial de Convidados na Porta', 14, 22);
    docPdf.setFontSize(11);
    docPdf.setTextColor(100, 100, 100);
    docPdf.text(`Contagem Final: ${totalGeral} pessoas (${totalAdultos} Adultos | ${totalCriancas} Crianças)`, 14, 30);

    const tableData: string[][] = [];
    confirmados.forEach(guest => {
      guest.adultos?.forEach(a => tableData.push([a, 'Adulto', guest.nomeFamilia]));
      guest.criancas?.forEach(c => tableData.push([c, 'Criança', guest.nomeFamilia]));
    });
    tableData.sort((a, b) => a[0].localeCompare(b[0]));

    autoTable(docPdf, { startY: 38, head: [['Nome Exato na Porta', 'Tipo', 'Grupo Origem']], body: tableData, headStyles: { fillColor: [218, 91, 91] } });
    docPdf.save('lista-porta-buffet-julia.pdf');
  };

  return (
    <>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}><LayoutDashboard size={24} color="#da5b5b" /> Painel Admin</h2>
          </div>
          
          <div className="admin-mobile-tabs">
            <button className={`tab-btn ${abaMobile === 'dashboard' ? 'active' : ''}`} onClick={() => setAbaMobile('dashboard')}>Dashboard</button>
            <button className={`tab-btn ${abaMobile === 'lista' ? 'active' : ''}`} onClick={() => setAbaMobile('lista')}>Lista ({guests.length})</button>
          </div>
        </aside>

        <main className="admin-content">
          <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.875rem' }}>Dashboard de Presenças</h1>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', maxWidth: '400px', justifyContent: 'flex-end' }}>
              <button onClick={() => setManualAddModal(true)} style={{...btnPrimaryStyle, display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '160px', justifyContent: 'center'}}>
                <Plus size={18} /> Add Manual
              </button>
              <button onClick={gerarPDFBuffet} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', flex: '1', minWidth: '160px' }}>
                <FileDown size={18} /> Baixar PDF
              </button>
            </div>
          </header>

          {/* DASHBOARD AREA (Oculto na aba Lista no mobile) */}
          <div className={abaMobile === 'lista' ? 'hide-on-mobile' : ''}>
            <div className="kpi-grid">
              <div className="kpi-card"><div className="kpi-info"><h3>Grupos</h3><p>{confirmados.length}</p></div><div className="kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><UserCheck size={24} /></div></div>
              <div className="kpi-card"><div className="kpi-info"><h3>Total na Porta</h3><p>{totalGeral}</p></div><div className="kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Users size={24} /></div></div>
              <div className="kpi-card"><div className="kpi-info"><h3>Adultos</h3><p>{totalAdultos}</p></div><div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={24} /></div></div>
              <div className="kpi-card"><div className="kpi-info"><h3>Crianças</h3><p>{totalCriancas}</p></div><div className="kpi-icon" style={{ background: '#fce7f3', color: '#db2777' }}><Baby size={24} /></div></div>
            </div>
          </div>

          {/* LIST AREA (Oculto na aba Dashboard no mobile) */}
          <div className={abaMobile === 'dashboard' ? 'hide-on-mobile' : ''}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
              <div className="search-bar">
                <Search size={20} color="#94a3b8" />
                <input type="text" placeholder="Buscar família, adulto ou criança..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="guest-cards-container">
              {loading ? (
                // SKELETON LOADERS
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '180px', width: '100%' }}></div>)}
                </div>
              ) : filteredGuests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>{searchTerm ? 'Nenhuma pessoa encontrada com este nome.' : 'Ninguém confirmou presença ainda.'}</div>
              ) : (
                filteredGuests.map((guest) => (
                  <div key={guest.id} className="family-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>{guest.nomeFamilia}</h3>
                        <span className={`status-badge status-${guest.status}`}>{guest.status.toUpperCase()}</span>
                      </div>
                      <button onClick={() => setDeleteModal({ isOpen: true, type: 'family', guestId: guest.id!, nomeFamilia: guest.nomeFamilia, personType: 'adultos', personIndex: -1, personName: '' })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', height: 'fit-content' }}>
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Adultos</h4>
                        {guest.adultos?.map((adulto, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                            <span>{adulto}</span>
                            <button onClick={() => setDeleteModal({ isOpen: true, type: 'person', guestId: guest.id!, nomeFamilia: guest.nomeFamilia, personType: 'adultos', personIndex: idx, personName: adulto })} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><UserMinus size={16} /></button>
                          </div>
                        ))}
                      </div>
                      {guest.criancas && guest.criancas.length > 0 && (
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Crianças</h4>
                          {guest.criancas?.map((crianca, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                              <span>{crianca}</span>
                              <button onClick={() => setDeleteModal({ isOpen: true, type: 'person', guestId: guest.id!, nomeFamilia: guest.nomeFamilia, personType: 'criancas', personIndex: idx, personName: crianca })} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><UserMinus size={16} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DE ADIÇÃO MANUAL */}
      {manualAddModal && (
        <div style={overlayStyle}>
          <div style={{...modalStyle, maxWidth: '500px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Adicionar Convidado</h3>
              <button onClick={() => setManualAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#94a3b8" /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Nome da Família / Grupo</label>
                <input type="text" style={inputStyle} value={manualData.nomeFamilia} onChange={e => setManualData({...manualData, nomeFamilia: e.target.value})} placeholder="Ex: Avós da Júlia" />
              </div>
              <div>
                <label style={labelStyle}>Adultos (Separe por vírgula)</label>
                <input type="text" style={inputStyle} value={manualData.adultosText} onChange={e => setManualData({...manualData, adultosText: e.target.value})} placeholder="Ex: Roberto, Maria das Graças" />
              </div>
              <div>
                <label style={labelStyle}>Crianças (Separe por vírgula) - Opcional</label>
                <input type="text" style={inputStyle} value={manualData.criancasText} onChange={e => setManualData({...manualData, criancasText: e.target.value})} placeholder="Ex: Pedrinho (4 anos)" />
              </div>
              <button onClick={executeManualAdd} style={{...btnPrimaryStyle, width: '100%', marginTop: '10px'}}>Salvar Convidado</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS DE EXCLUSÃO E ALERTA MANTIDOS */}
      {deleteModal.isOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}><AlertTriangle size={24} /> Atenção</h3>
            </div>
            <p style={{ color: '#334155' }}>
              {deleteModal.type === 'family' ? <>Excluir a família <strong>{deleteModal.nomeFamilia}</strong>?</> : <>Remover <strong>{deleteModal.personName}</strong> do grupo da {deleteModal.nomeFamilia}?</>}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} style={{ padding: '10px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={executeDelete} style={{ padding: '10px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {alertModal.isOpen && (
        <div style={overlayStyle}>
          <div style={{...modalStyle, textAlign: 'center'}}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              {alertModal.isError ? <AlertTriangle size={48} color="#ef4444" /> : <CheckCircle2 size={48} color="#10b981" />}
            </div>
            <h3 style={{ margin: '0 0 12px 0' }}>{alertModal.isError ? 'Aviso' : 'Sucesso'}</h3>
            <p style={{ color: '#475569', marginBottom: '24px' }}>{alertModal.message}</p>
            <button onClick={() => setAlertModal({ isOpen: false, message: '', isError: false })} style={btnPrimaryStyle}>Entendi</button>
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(3px)' };
const modalStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px' };
const btnPrimaryStyle: React.CSSProperties = { padding: '10px 24px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' };
const labelStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' };