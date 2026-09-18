import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Guest } from '../types/guest';
import { Users, UserCheck, Clock, Baby, LayoutDashboard, CheckCircle2, FileDown, Trash2, Info, AlertTriangle, X, UserMinus } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Admin() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS DOS MODAIS
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: 'family', // 'family' ou 'person'
    guestId: '',
    nomeFamilia: '',
    personType: 'adultos' as 'adultos' | 'criancas',
    personIndex: -1,
    personName: ''
  });
  
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', isError: false });

  useEffect(() => {
    const fetchGuests = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'guests'));
        const guestsData = querySnapshot.docs.map(document => ({
          id: document.id,
          ...document.data()
        })) as Guest[];
        setGuests(guestsData);
      } catch (error) {
        console.error("Erro ao buscar convidados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGuests();
  }, []);

  // FUNÇÕES PARA ABRIR O MODAL DE EXCLUSÃO
  const openDeleteFamily = (guestId: string, nomeFamilia: string) => {
    setDeleteModal({ isOpen: true, type: 'family', guestId, nomeFamilia, personType: 'adultos', personIndex: -1, personName: '' });
  };

  const openDeletePerson = (guestId: string, nomeFamilia: string, personType: 'adultos' | 'criancas', personIndex: number, personName: string) => {
    setDeleteModal({ isOpen: true, type: 'person', guestId, nomeFamilia, personType, personIndex, personName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ ...deleteModal, isOpen: false });
  };

  // EXECUÇÃO DA EXCLUSÃO (FAMÍLIA INTEIRA OU PESSOA ESPECÍFICA)
  const executeDelete = async () => {
    const { type, guestId, personType, personIndex } = deleteModal;
    
    try {
      if (type === 'family') {
        // Exclui o documento inteiro do banco
        await deleteDoc(doc(db, 'guests', guestId));
        setGuests(guests.filter(g => g.id !== guestId));
        setAlertModal({ isOpen: true, message: "Família excluída com sucesso!", isError: false });
      } else {
        // Exclui apenas uma pessoa específica da lista
        const guestTarget = guests.find(g => g.id === guestId);
        if (guestTarget) {
          const updatedList = [...(guestTarget[personType] || [])];
          updatedList.splice(personIndex, 1); // Remove 1 item no index específico

          // Atualiza o documento no Firebase
          await updateDoc(doc(db, 'guests', guestId), {
            [personType]: updatedList
          });

          // Atualiza a tela localmente
          setGuests(guests.map(g => {
            if (g.id === guestId) {
              return { ...g, [personType]: updatedList };
            }
            return g;
          }));
          setAlertModal({ isOpen: true, message: "Pessoa removida da lista com sucesso!", isError: false });
        }
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setAlertModal({ isOpen: true, message: "Ocorreu um erro ao tentar remover. Tente novamente.", isError: true });
    } finally {
      closeDeleteModal();
    }
  };

  // KPIs
  const confirmados = guests.filter(g => g.status === 'confirmado');
  const totalAdultos = confirmados.reduce((acc, curr) => acc + (curr.adultos?.length || 0), 0);
  const totalCriancas = confirmados.reduce((acc, curr) => acc + (curr.criancas?.length || 0), 0);
  const totalGeral = totalAdultos + totalCriancas;

  // FUNÇÃO PARA GERAR O PDF DO BUFFET
  const gerarPDFBuffet = () => {
    if (confirmados.length === 0) {
      setAlertModal({ isOpen: true, message: "Não há convidados confirmados para gerar o PDF.", isError: true });
      return;
    }

    const docPdf = new jsPDF();
    docPdf.setFontSize(18);
    docPdf.setTextColor(218, 91, 91); 
    docPdf.text('Lista Oficial de Convidados na Porta - Júlia (1 Ano)', 14, 22);
    
    docPdf.setFontSize(11);
    docPdf.setTextColor(100, 100, 100);
    docPdf.text(`Contagem Final: ${totalGeral} pessoas (${totalAdultos} Adultos | ${totalCriancas} Crianças)`, 14, 30);

    const tableData: string[][] = [];
    confirmados.forEach(guest => {
      guest.adultos?.forEach(adulto => {
        tableData.push([adulto, 'Adulto', guest.nomeFamilia]);
      });
      guest.criancas?.forEach(crianca => {
        tableData.push([crianca, 'Criança', guest.nomeFamilia]);
      });
    });

    tableData.sort((a, b) => a[0].localeCompare(b[0]));

    autoTable(docPdf, {
      startY: 38,
      head: [['Nome Exato na Porta', 'Tipo (Adulto/Criança)', 'Grupo/Família Origem']],
      body: tableData,
      headStyles: { fillColor: [218, 91, 91] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    docPdf.save('lista-porta-buffet-julia.pdf');
  };

  return (
    <>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div>
            <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
              <LayoutDashboard size={24} color="#da5b5b" />
              Painel Admin
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '5px 0 10px 34px' }}>
              Júlia Rosa - 1 Aninho
            </p>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', margin: '20px 10px 0 10px', fontSize: '0.85rem', color: '#475569', borderLeft: '3px solid #da5b5b' }}>
              <strong>Legenda de Uso:</strong><br/>
              Esta tela é o seu controle principal. Apenas você tem acesso a ela. Tudo o que as pessoas preencherem no site oficial cairá diretamente aqui em tempo real.
            </div>
          </div>
        </aside>

        <main className="admin-content">
          <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.875rem' }}>Dashboard de Presenças</h1>
              <p style={{ margin: 0, color: '#64748b', maxWidth: '600px' }}>
                Aqui você acompanha os números exatos da festa. Monitore as confirmações e exporte o documento oficial.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', width: '100%', maxWidth: 'max-content' }}>
              <button 
                onClick={gerarPDFBuffet}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(218,91,91,0.2)', width: '100%' }}
              >
                <FileDown size={20} />
                Baixar PDF do Buffet
              </button>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>* Gera arquivo em ordem alfabética</span>
            </div>
          </header>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Grupos Cadastrados</h3>
                <p>{confirmados.length}</p>
              </div>
              <div className="kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><UserCheck size={24} /></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Total na Porta</h3>
                <p>{totalGeral}</p>
              </div>
              <div className="kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Users size={24} /></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Total Adultos</h3>
                <p>{totalAdultos}</p>
              </div>
              <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={24} /></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Total Crianças</h3>
                <p>{totalCriancas}</p>
              </div>
              <div className="kpi-icon" style={{ background: '#fce7f3', color: '#db2777' }}><Baby size={24} /></div>
            </div>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Info size={24} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#b45309' }}>Controle Granular de Convidados</h4>
              <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
                Use os botões abaixo para gerenciar a lista. Você pode <strong>excluir uma família inteira</strong> (botão vermelho superior) ou <strong>remover apenas uma pessoa específica</strong> clicando no ícone ao lado do nome dela.
              </p>
            </div>
          </div>

          {/* NOVA LISTAGEM EM FORMATO DE CARDS */}
          <div className="guest-cards-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando a lista de convidados...</div>
            ) : guests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Ninguém confirmou presença pelo site ainda.</div>
            ) : (
              guests.map((guest) => (
                <div key={guest.id} className="family-card">
                  
                  {/* Cabeçalho do Card (Família) */}
                  <div className="family-card-header">
                    <div>
                      <h3 className="family-name">{guest.nomeFamilia}</h3>
                      <span className={`status-badge status-${guest.status}`}>
                        {guest.status === 'confirmado' && <CheckCircle2 size={14} />}
                        {guest.status.toUpperCase()}
                      </span>
                    </div>
                    <button 
                      onClick={() => openDeleteFamily(guest.id, guest.nomeFamilia)}
                      title="Excluir família inteira"
                      className="btn-delete-family"
                    >
                      <Trash2 size={18} /> Apagar Grupo
                    </button>
                  </div>

                  {/* Corpo do Card (Membros) */}
                  <div className="family-card-body">
                    <div className="members-section">
                      <h4 className="members-title">Adultos ({(guest.adultos || []).length})</h4>
                      {guest.adultos?.length === 0 && <p className="no-members">Nenhum adulto</p>}
                      <ul className="members-list">
                        {guest.adultos?.map((adulto, index) => (
                          <li key={`adulto-${index}`} className="member-item">
                            <span>{adulto}</span>
                            <button 
                              onClick={() => openDeletePerson(guest.id, guest.nomeFamilia, 'adultos', index, adulto)}
                              title="Remover esta pessoa"
                              className="btn-delete-person"
                            >
                              <UserMinus size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="members-section">
                      <h4 className="members-title">Crianças ({(guest.criancas || []).length})</h4>
                      {guest.criancas?.length === 0 && <p className="no-members">Nenhuma criança</p>}
                      <ul className="members-list">
                        {guest.criancas?.map((crianca, index) => (
                          <li key={`crianca-${index}`} className="member-item">
                            <span>{crianca}</span>
                            <button 
                              onClick={() => openDeletePerson(guest.id, guest.nomeFamilia, 'criancas', index, crianca)}
                              title="Remover esta pessoa"
                              className="btn-delete-person"
                            >
                              <UserMinus size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Dinâmico para Pessoa ou Família) */}
      {deleteModal.isOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <AlertTriangle size={24} /> Atenção Administrador
              </h3>
              <button onClick={closeDeleteModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={24} />
              </button>
            </div>
            
            <p style={{ color: '#334155', lineHeight: '1.5' }}>
              {deleteModal.type === 'family' 
                ? <>Tem certeza que deseja excluir toda a família <strong>{deleteModal.nomeFamilia}</strong>?</>
                : <>Tem certeza que deseja remover <strong>{deleteModal.personName}</strong> do grupo da {deleteModal.nomeFamilia}?</>
              }
            </p>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              {deleteModal.type === 'family' 
                ? "Isso apagará todos do sistema e nenhum nome sairá na lista do buffet."
                : "Apenas esta pessoa será removida da lista. Os demais continuarão confirmados."
              }
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={closeDeleteModal} style={btnCancelStyle}>
                Cancelar
              </button>
              <button onClick={executeDelete} style={btnDangerStyle}>
                Sim, {deleteModal.type === 'family' ? 'Excluir Família' : 'Remover Pessoa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA GERAL */}
      {alertModal.isOpen && (
        <div style={overlayStyle}>
          <div style={{...modalStyle, textAlign: 'center', padding: '32px 24px'}}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              {alertModal.isError ? <AlertTriangle size={48} color="#ef4444" /> : <CheckCircle2 size={48} color="#10b981" />}
            </div>
            <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>
              {alertModal.isError ? 'Aviso' : 'Sucesso'}
            </h3>
            <p style={{ color: '#475569', marginBottom: '24px' }}>
              {alertModal.message}
            </p>
            <button onClick={() => setAlertModal({ isOpen: false, message: '', isError: false })} style={btnPrimaryStyle}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ESTILOS INLINE DOS MODAIS
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(3px)'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '24px',
  borderRadius: '12px',
  width: '90%',
  maxWidth: '450px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
};

const btnCancelStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#f1f5f9',
  color: '#475569',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  cursor: 'pointer'
};

const btnDangerStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  cursor: 'pointer'
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: 'var(--primary-color, #da5b5b)', 
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  cursor: 'pointer'
};