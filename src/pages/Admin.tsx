import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Guest } from '../types/guest';
import { Users, UserCheck, Clock, Baby, LayoutDashboard, CheckCircle2, FileDown, Trash2, Info, AlertTriangle, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Admin() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS DOS MODAIS
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', nomeFamilia: '' });
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

  // FUNÇÕES DO MODAL DE EXCLUSÃO
  const openDeleteModal = (id: string, nomeFamilia: string) => {
    setDeleteModal({ isOpen: true, id, nomeFamilia });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, id: '', nomeFamilia: '' });
  };

  const executeDeleteGuest = async () => {
    const { id } = deleteModal;
    try {
      await deleteDoc(doc(db, 'guests', id));
      setGuests(guests.filter(g => g.id !== id));
      closeDeleteModal();
      
      // Feedback de sucesso
      setAlertModal({ isOpen: true, message: "Cadastro excluído com sucesso!", isError: false });
    } catch (error) {
      console.error("Erro ao excluir:", error);
      closeDeleteModal();
      setAlertModal({ isOpen: true, message: "Ocorreu um erro ao tentar remover. Tente novamente.", isError: true });
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
          <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.875rem' }}>Dashboard de Presenças</h1>
              <p style={{ margin: 0, color: '#64748b', maxWidth: '600px' }}>
                Aqui você acompanha os números exatos da festa. Monitore as confirmações e exporte o documento oficial que deverá ser entregue na recepção do buffet.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <button 
                onClick={gerarPDFBuffet}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(218,91,91,0.2)' }}
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
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Famílias que preencheram</span>
              </div>
              <div className="kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><UserCheck size={24} /></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Total na Porta</h3>
                <p>{totalGeral}</p>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Soma de todas as pessoas</span>
              </div>
              <div className="kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Users size={24} /></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Total Adultos</h3>
                <p>{totalAdultos}</p>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pagantes (Geralmente)</span>
              </div>
              <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Clock size={24} /></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Total Crianças</h3>
                <p>{totalCriancas}</p>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Isentos (A depender da idade)</span>
              </div>
              <div className="kpi-icon" style={{ background: '#fce7f3', color: '#db2777' }}><Baby size={24} /></div>
            </div>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Info size={24} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#b45309' }}>Controle de Acesso (Remoção de Penetras)</h4>
              <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
                Esta tabela lista todas as respostas recebidas através do seu link. <strong>Se você identificar um cadastro de alguém que não foi convidado</strong>, clique no botão vermelho da lixeira na coluna "Ações" para deletar o registro. Eles não constarão no PDF gerado.
              </p>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome Identificador (Família)</th>
                  <th>Status</th>
                  <th>Adultos Digitados</th>
                  <th>Crianças Digitadas</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Carregando a lista de convidados...</td></tr>
                ) : guests.map((guest) => (
                  <tr key={guest.id}>
                    <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{guest.nomeFamilia}</td>
                    <td>
                      <span className={`status-badge status-${guest.status}`}>
                        {guest.status === 'confirmado' && <CheckCircle2 size={14} />}
                        {guest.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.9rem' }}>
                      {guest.adultos?.join(', ') || <span style={{ color: '#cbd5e1' }}>Vazio</span>}
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.9rem' }}>
                      {guest.criancas?.join(', ') || <span style={{ color: '#cbd5e1' }}>Nenhuma</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => openDeleteModal(guest.id, guest.nomeFamilia)}
                        title="Excluir cadastro indevido"
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', transition: '0.2s' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && guests.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Ninguém confirmou presença pelo site ainda. Quando confirmarem, aparecerão aqui.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
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
              Tem certeza que deseja excluir o cadastro da <strong>{deleteModal.nomeFamilia}</strong>?
            </p>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              Isso apagará a família do sistema e os nomes NÃO sairão na lista do buffet. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={closeDeleteModal} style={btnCancelStyle}>
                Cancelar
              </button>
              <button onClick={executeDeleteGuest} style={btnDangerStyle}>
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA GERAL (Sucesso / Erro) */}
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

// ESTILOS INLINE DOS MODAIS PARA NÃO PRECISAR MEXER NO SEU ARQUIVO CSS
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
  background: 'var(--primary-color, #da5b5b)', // fallback para vermelho se a variável não estiver mapeada no root deste componente
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: '600',
  cursor: 'pointer'
};