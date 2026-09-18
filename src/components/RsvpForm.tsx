import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Info, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export function RsvpForm() {
  // CONFIGURAÇÃO DO ENCERRAMENTO (Altere para a data limite do Buffet)
  const dataLimite = new Date('2026-10-05T23:59:59');
  const isEncerrado = new Date() > dataLimite;

  const [nomeFamilia, setNomeFamilia] = useState('');
  const [adultos, setAdultos] = useState<string[]>(['']); 
  const [criancas, setCriancas] = useState<{nome: string, idade: string}[]>([]);
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', isError: false });

  const handleAddAdulto = () => setAdultos([...adultos, '']);
  const handleRemoveAdulto = (index: number) => setAdultos(adultos.filter((_, i) => i !== index));
  const handleAddCrianca = () => setCriancas([...criancas, { nome: '', idade: '' }]);
  const handleRemoveCrianca = (index: number) => setCriancas(criancas.filter((_, i) => i !== index));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // VALIDAÇÃO 1: Nome da família muito curto
    if (nomeFamilia.trim().length < 3) {
      setAlertModal({ isOpen: true, message: "O nome do convidado principal precisa ter pelo menos 3 letras.", isError: true });
      setIsSubmitting(false);
      return;
    }

    const adultosFiltrados = adultos.filter(nome => nome.trim() !== '');
    
    // VALIDAÇÃO 2: Adultos com nome curto ou vazio
    if (adultosFiltrados.length === 0) {
      setAlertModal({ isOpen: true, message: "Por favor, adicione o nome de pelo menos um adulto.", isError: true });
      setIsSubmitting(false);
      return;
    }

    const temNomeCurto = adultosFiltrados.some(nome => nome.trim().length < 3);
    if (temNomeCurto) {
      setAlertModal({ isOpen: true, message: "Por favor, insira nomes completos para os adultos (mínimo 3 letras). Evite abreviações para a lista do buffet.", isError: true });
      setIsSubmitting(false);
      return;
    }
    
    const criancasFiltradas = criancas
      .filter(c => c.nome.trim().length >= 2)
      .map(c => c.idade.trim() ? `${c.nome.trim()} (${c.idade.trim()})` : c.nome.trim());
    
    try {
      await addDoc(collection(db, 'guests'), { 
        nomeFamilia,
        adultos: adultosFiltrados,
        criancas: criancasFiltradas,
        status: 'confirmado',
        data_confirmacao: new Date()
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setAlertModal({ isOpen: true, message: "Houve um erro de conexão ao enviar. Por favor, tente novamente.", isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  // TELA DE ENCERRAMENTO
  if (isEncerrado) {
    return (
      <div className="form-container" style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
          <Lock size={48} color="#94a3b8" />
        </div>
        <h2 className="form-title" style={{ color: '#64748b' }}>Confirmações Encerradas</h2>
        <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6' }}>
          A lista oficial já foi enviada para o buffet para a contagem exata da festa. <br/><br/>
          Se você teve algum imprevisto ou precisa alterar sua presença, por favor, <strong>entre em contato diretamente com os pais da Júlia</strong>.
        </p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit} className="form-container">
            <h2 className="form-title">Espelho, espelho meu...</h2>
            <p style={{ textAlign: 'center', margin: '0 0 20px 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>Quem está confirmando presença para essa tarde mágica?</p>
            
            <div className="input-group" style={{ marginBottom: '15px' }}>
              <label>Convidado Principal ou Família</label>
              <p style={helperTextStyle}>Como devemos identificar vocês? (ex: Família Silva do Trabalho, Casal João e Maria)</p>
              <input type="text" required value={nomeFamilia} onChange={(e) => setNomeFamilia(e.target.value)} placeholder="Ex: Família Silva" />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '15px 0' }} />

            {/* ADULTOS */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ margin: 0 }}>Adultos Convidados</label>
                <button type="button" onClick={handleAddAdulto} style={addButtonStyle}><Plus size={16} /> Adicionar</button>
              </div>
              <p style={helperTextStyle}>Digite o nome exatamente como deve estar na porta.</p>
              {adultos.map((adulto, index) => (
                <div key={`adulto-${index}`} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input type="text" required value={adulto} onChange={(e) => { const novos = [...adultos]; novos[index] = e.target.value; setAdultos(novos); }} placeholder="Nome do Adulto" style={{ flex: 1 }} />
                  {adultos.length > 1 && (
                    <button type="button" onClick={() => handleRemoveAdulto(index)} style={removeButtonStyle}><Trash2 size={18} /></button>
                  )}
                </div>
              ))}
            </div>

            {/* CRIANÇAS */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', marginBottom: '5px' }}>
                <label style={{ margin: 0 }}>Crianças Convidadas</label>
                <button type="button" onClick={handleAddCrianca} style={addButtonStyle}><Plus size={16} /> Adicionar</button>
              </div>
              {criancas.length === 0 && <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic' }}>Nenhuma criança adicionada.</p>}
              {criancas.map((crianca, index) => (
                <div key={`crianca-${index}`} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input type="text" required value={crianca.nome} onChange={(e) => { const novas = [...criancas]; novas[index].nome = e.target.value; setCriancas(novas); }} placeholder="Nome" style={{ flex: 2 }} />
                  <input type="text" required value={crianca.idade} onChange={(e) => { const novas = [...criancas]; novas[index].idade = e.target.value; setCriancas(novas); }} placeholder="Ex: 4 anos" style={{ flex: 1 }} />
                  <button type="button" onClick={() => handleRemoveCrianca(index)} style={removeButtonStyle}><Trash2 size={18} /></button>
                </div>
              ))}
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '15px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '10px' }}>
              <Info size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ margin: 0, color: '#92400e', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  <strong>Um pedido especial:</strong> Nossa festa foi planejada com muito carinho para uma quantidade exata de pessoas. Pedimos gentilmente que <strong>não compartilhe este link</strong> com terceiros. 🍎
                </p>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmitting} style={{ marginTop: '20px' }}>
              {isSubmitting ? 'Preparando a carruagem...' : 'Confirmar Presença'}
            </button>
          </motion.form>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="form-container" style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#fff' }}>
            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} style={{ fontSize: '3.5rem', marginBottom: '15px' }}>🍎✨</motion.div>
            <h2 className="form-title" style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Presença Confirmada!</h2>
            <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', lineHeight: '1.6' }}>A carruagem já está reservada para <strong>{nomeFamilia}</strong>!<br/><br/>Mal podemos esperar para vivermos juntos essa tarde mágica.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE ALERTA GERAL MANTIDO */}
      {alertModal.isOpen && (
        <div style={overlayStyle}>
          <div style={{...modalStyle, textAlign: 'center', padding: '32px 24px'}}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              {alertModal.isError ? <AlertTriangle size={48} color="#ef4444" /> : <CheckCircle2 size={48} color="#10b981" />}
            </div>
            <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>{alertModal.isError ? 'Aviso' : 'Sucesso'}</h3>
            <p style={{ color: '#475569', marginBottom: '24px', lineHeight: '1.5' }}>{alertModal.message}</p>
            <button onClick={() => setAlertModal({ isOpen: false, message: '', isError: false })} style={btnPrimaryStyle}>Entendi</button>
          </div>
        </div>
      )}
    </>
  );
}

const helperTextStyle: React.CSSProperties = { fontSize: '0.8rem', color: '#64748b', margin: '0 0 8px 0', lineHeight: '1.3' };
const addButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 'bold', padding: '4px 8px' };
const removeButtonStyle: React.CSSProperties = { padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(3px)' };
const modalStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };
const btnPrimaryStyle: React.CSSProperties = { padding: '10px 24px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' };