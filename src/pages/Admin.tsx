import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Guest } from '../types/guest';
import { 
  Users, UserCheck, Clock, Baby, LayoutDashboard, CheckCircle2, 
  FileDown, Trash2, AlertTriangle, X, UserMinus, Search, Plus, 
  Edit3, Calculator, Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// FUNÇÃO INTELIGENTE: Analisa a string da criança para descobrir a idade e regras do buffet
const analisarIdadeCrianca = (texto: string) => {
  const strLower = texto.toLowerCase();
  
  // Se contiver a palavra "mes", "mês" ou "meses", é bebê (sempre isento)
  if (strLower.includes('mes') || strLower.includes('mês')) {
    return { isento: true, tag: 'Bebê (Isento)', bg: '#dcfce7', color: '#166534' };
  }
  
  // Extrai o primeiro número encontrado no texto
  const match = strLower.match(/(\d+)/);
  if (match) {
    const age = parseInt(match[0]);
    if (age <= 7) return { isento: true, tag: 'Até 7 anos (Isento)', bg: '#dcfce7', color: '#166534' };
    if (age <= 12) return { isento: false, tag: `${age} anos (Infantil)`, bg: '#fef3c7', color: '#92400e' };
    return { isento: false, tag: '+12 anos (Pagante)', bg: '#fee2e2', color: '#991b1b' };
  }
  
  return { isento: false, tag: 'Idade não informada', bg: '#f1f5f9', color: '#475569' };
};


export function Admin() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [abaMobile, setAbaMobile] = useState<'dashboard' | 'lista'>('dashboard');

  // MODAIS E ESTADOS
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: 'family', guestId: '', nomeFamilia: '', personType: 'adultos' as 'adultos'|'criancas', personIndex: -1, personName: '' });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', isError: false });
  const [manualAddModal, setManualAddModal] = useState(false);
  const [manualData, setManualData] = useState({ nomeFamilia: '', adultosText: '', criancasText: '' });
  
  // ESTADO DE EDIÇÃO (NOVO)
  const [editModal, setEditModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

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

  // ==========================================
  // LÓGICA DE EXCLUSÃO E ADIÇÃO MANUAL MANTIDAS
  // ==========================================
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

  const executeManualAdd = async () => {
    if (!manualData.nomeFamilia) return;
    const adultosArray = manualData.adultosText.split(',').map(n => n.trim()).filter(n => n !== '');
    const criancasArray = manualData.criancasText.split(',').map(n => n.trim()).filter(n => n !== '');
    if (adultosArray.length === 0) return setAlertModal({ isOpen: true, message: "Insira ao menos um adulto.", isError: true });

    try {
      const newGuest = { nomeFamilia: manualData.nomeFamilia, adultos: adultosArray, criancas: criancasArray, status: 'confirmado' as const, data_confirmacao: new Date() };
      const docRef = await addDoc(collection(db, 'guests'), newGuest);
      setGuests([{ id: docRef.id, ...newGuest }, ...guests]);
      setManualAddModal(false);
      setManualData({ nomeFamilia: '', adultosText: '', criancasText: '' });
      setAlertModal({ isOpen: true, message: "Convidado adicionado manualmente!", isError: false });
    } catch (error) {
      setAlertModal({ isOpen: true, message: "Erro ao salvar no banco.", isError: true });
    }
  };

 // ==========================================
  // NOVA LÓGICA DE EDIÇÃO (CORRIGIDA)
  // ==========================================
  const openEditModal = (guest: Guest) => {
    // Faz uma cópia super segura, garantindo que as listas de adultos e crianças existam 
    // mesmo que sejam registros antigos do banco de dados.
    setEditingGuest({
      ...guest,
      adultos: guest.adultos ? [...guest.adultos] : [],
      criancas: guest.criancas ? [...guest.criancas] : []
    }); 
    setEditModal(true);
  };

  const executeEdit = async () => {
    if (!editingGuest || !editingGuest.id) return;
    
    // Limpa campos vazios de forma segura (usando o || [] para evitar erros de undefined)
    const adultosFiltrados = (editingGuest.adultos || []).filter(a => a.trim() !== '');
    const criancasFiltradas = (editingGuest.criancas || []).filter(c => c.trim() !== '');

    if (adultosFiltrados.length === 0) {
      return setAlertModal({ isOpen: true, message: "A família precisa ter ao menos um adulto.", isError: true });
    }

    try {
      // Atualiza apenas os campos necessários no Firebase
      await updateDoc(doc(db, 'guests', editingGuest.id), {
        nomeFamilia: editingGuest.nomeFamilia,
        adultos: adultosFiltrados,
        criancas: criancasFiltradas
      });
      
      // Atualiza a tela mantendo as informações originais intocadas
      setGuests(guests.map(g => 
        g.id === editingGuest.id 
          ? { ...editingGuest, adultos: adultosFiltrados, criancas: criancasFiltradas } 
          : g
      ));
      
      setEditModal(false);
      setAlertModal({ isOpen: true, message: "Dados atualizados com sucesso!", isError: false });
    } catch (error) {
      console.error("Erro ao editar no Firebase:", error);
      setAlertModal({ isOpen: true, message: "Erro ao atualizar dados. Tente novamente.", isError: true });
    }
  };


  // ==========================================
  // CÁLCULOS INTELIGENTES (KPIs)
  // ==========================================
  const confirmados = guests.filter(g => g.status === 'confirmado');
  const totalAdultos = confirmados.reduce((acc, curr) => acc + (curr.adultos?.length || 0), 0);
  const totalCriancasGeral = confirmados.reduce((acc, curr) => acc + (curr.criancas?.length || 0), 0);
  const totalGeral = totalAdultos + totalCriancasGeral;

  // Calcula quantas crianças SÃO pagantes (isento = false)
  const criancasPagantes = confirmados.reduce((acc, curr) => {
    const pagantesNestaFamilia = (curr.criancas || []).filter(c => !analisarIdadeCrianca(c).isento).length;
    return acc + pagantesNestaFamilia;
  }, 0);
  
  const totalPagantesEstimado = totalAdultos + criancasPagantes;

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
    docPdf.text(`Contagem: ${totalGeral} pessoas (${totalAdultos} Adultos | ${totalCriancasGeral} Crianças)`, 14, 30);
    docPdf.text(`Pagantes Estimados: ${totalPagantesEstimado} pessoas`, 14, 36);

    const tableData: string[][] = [];
    confirmados.forEach(guest => {
      guest.adultos?.forEach(a => tableData.push([a, 'Adulto', guest.nomeFamilia]));
      guest.criancas?.forEach(c => {
        const info = analisarIdadeCrianca(c);
        tableData.push([c, `Criança (${info.tag})`, guest.nomeFamilia]);
      });
    });
    tableData.sort((a, b) => a[0].localeCompare(b[0]));

    autoTable(docPdf, { startY: 42, head: [['Nome Exato na Porta', 'Categoria', 'Grupo Origem']], body: tableData, headStyles: { fillColor: [218, 91, 91] } });
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

          {/* DASHBOARD AREA */}
          <div className={abaMobile === 'lista' ? 'hide-on-mobile' : ''}>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-info"><h3>Total na Porta</h3><p>{totalGeral}</p></div>
                <div className="kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Users size={24} /></div>
              </div>
              <div className="kpi-card" style={{ border: '2px solid #fef3c7', background: '#fffbeb' }}>
                <div className="kpi-info">
                  <h3 style={{ color: '#b45309' }}>Pagantes (Buffet)</h3>
                  <p style={{ color: '#b45309' }}>{totalPagantesEstimado}</p>
                </div>
                <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Calculator size={24} /></div>
              </div>
              <div className="kpi-card">
                <div className="kpi-info"><h3>Adultos</h3><p>{totalAdultos}</p></div>
                <div className="kpi-icon" style={{ background: '#f1f5f9', color: '#64748b' }}><Clock size={24} /></div>
              </div>
              <div className="kpi-card">
                <div className="kpi-info"><h3>Crianças</h3><p>{totalCriancasGeral}</p></div>
                <div className="kpi-icon" style={{ background: '#fce7f3', color: '#db2777' }}><Baby size={24} /></div>
              </div>
            </div>
          </div>

          {/* LIST AREA */}
          <div className={abaMobile === 'dashboard' ? 'hide-on-mobile' : ''}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
              <div className="search-bar">
                <Search size={20} color="#94a3b8" />
                <input type="text" placeholder="Buscar família, adulto ou criança..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="guest-cards-container">
              {loading ? (
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
                        <h3 style={{ margin: '0 0 5px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {guest.nomeFamilia}
                        </h3>
                        <span className={`status-badge status-${guest.status}`}>{guest.status.toUpperCase()}</span>
                      </div>
                      
                      {/* BOTÕES DE AÇÃO DO CARD */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEditModal(guest)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Edit3 size={16} /> <span className="hide-on-mobile">Editar</span>
                        </button>
                        <button onClick={() => setDeleteModal({ isOpen: true, type: 'family', guestId: guest.id!, nomeFamilia: guest.nomeFamilia, personType: 'adultos', personIndex: -1, personName: '' })} style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Trash2 size={16} /> <span className="hide-on-mobile">Apagar</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Adultos ({guest.adultos.length})</h4>
                        {guest.adultos?.map((adulto, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                            <span style={{ color: '#334155' }}>{adulto}</span>
                            <button onClick={() => setDeleteModal({ isOpen: true, type: 'person', guestId: guest.id!, nomeFamilia: guest.nomeFamilia, personType: 'adultos', personIndex: idx, personName: adulto })} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><UserMinus size={16} /></button>
                          </div>
                        ))}
                      </div>
                      {guest.criancas && guest.criancas.length > 0 && (
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Crianças ({guest.criancas.length})</h4>
                          {guest.criancas?.map((crianca, idx) => {
                            const info = analisarIdadeCrianca(crianca);
                            return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <span style={{ color: '#334155' }}>{crianca}</span>
                                  {/* TAG INTELIGENTE DA CRIANÇA */}
                                  <span style={{ background: info.bg, color: info.color, padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                    {info.tag}
                                  </span>
                                </div>
                                <button onClick={() => setDeleteModal({ isOpen: true, type: 'person', guestId: guest.id!, nomeFamilia: guest.nomeFamilia, personType: 'criancas', personIndex: idx, personName: crianca })} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><UserMinus size={16} /></button>
                              </div>
                            );
                          })}
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


      {/* MODAL DE EDIÇÃO COMPLETA */}
      {editModal && editingGuest && (
        <div style={overlayStyle}>
          <div style={{...modalStyle, maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="var(--primary-color)"/> Editar Família
              </h3>
              <button onClick={() => setEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#94a3b8" /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Nome Principal */}
              <div>
                <label style={labelStyle}>Nome da Família / Grupo</label>
                <input 
                  type="text" style={inputStyle} 
                  value={editingGuest.nomeFamilia} 
                  onChange={e => setEditingGuest({...editingGuest, nomeFamilia: e.target.value})} 
                />
              </div>

              {/* Editar Adultos */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{...labelStyle, margin: 0}}>Adultos</label>
                  <button onClick={() => setEditingGuest({...editingGuest, adultos: [...editingGuest.adultos, '']})} style={btnActionStyle}><Plus size={14}/> Adicionar</button>
                </div>
                {editingGuest.adultos.map((adulto, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <input 
                      type="text" style={{...inputStyle, padding: '8px'}} 
                      value={adulto} 
                      onChange={e => {
                        const novos = [...editingGuest.adultos];
                        novos[i] = e.target.value;
                        setEditingGuest({...editingGuest, adultos: novos});
                      }} 
                    />
                    <button onClick={() => setEditingGuest({...editingGuest, adultos: editingGuest.adultos.filter((_, idx) => idx !== i)})} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>

              {/* Editar Crianças */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{...labelStyle, margin: 0}}>Crianças</label>
                  <button onClick={() => setEditingGuest({...editingGuest, criancas: [...editingGuest.criancas, '']})} style={btnActionStyle}><Plus size={14}/> Adicionar</button>
                </div>
                {editingGuest.criancas.map((crianca, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <input 
                      type="text" style={{...inputStyle, padding: '8px'}} 
                      value={crianca} 
                      onChange={e => {
                        const novas = [...editingGuest.criancas];
                        novas[i] = e.target.value;
                        setEditingGuest({...editingGuest, criancas: novas});
                      }} 
                      placeholder="Ex: João (5 anos)"
                    />
                    <button onClick={() => setEditingGuest({...editingGuest, criancas: editingGuest.criancas.filter((_, idx) => idx !== i)})} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0 10px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                  </div>
                ))}
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '5px 0 0 0' }}>Mantenha o formato "Nome (Idade)" para o painel calcular a isenção do buffet corretamente.</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditModal(false)} style={{ padding: '10px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={executeEdit} style={btnPrimaryStyle}>Salvar Alterações</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL DE ADIÇÃO MANUAL MANTIDO */}
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
                <label style={labelStyle}>Crianças (Separe por vírgula)</label>
                <p style={{fontSize: '0.75rem', color: '#64748b', margin: '0 0 5px 0'}}>Coloque a idade entre parênteses.</p>
                <input type="text" style={inputStyle} value={manualData.criancasText} onChange={e => setManualData({...manualData, criancasText: e.target.value})} placeholder="Ex: Pedrinho (4 anos), Sofia (8 meses)" />
              </div>
              <button onClick={executeManualAdd} style={{...btnPrimaryStyle, width: '100%', marginTop: '10px'}}>Salvar Convidado</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO MANTIDO */}
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

      {/* MODAL DE ALERTA GERAL MANTIDO */}
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
const btnActionStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' };