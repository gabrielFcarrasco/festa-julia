import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, CalendarHeart, Clock } from 'lucide-react';
import { RsvpForm } from '../components/RsvpForm';

export function Home() {
  // 0 = Fechado | 1 = Aba Abrindo | 2 = Carta Subindo | 3 = Tela Cheia
  const [step, setStep] = useState(0);

  const handleOpen = () => {
    if (step !== 0) return;
    
    setStep(1); // 1. Abre a aba do envelope
    
    setTimeout(() => {
      setStep(2); // 2. A carta desliza para cima
    }, 450); 
    
    setTimeout(() => {
      setStep(3); // 3. A carta expande e o envelope cai
    }, 1100);
  };

  const mapsUrl = "https://www.google.com/maps?q=Rua+Liberato+Barroso,+453+-+Jardim+Santa+Adélia,+SP&output=embed";

  return (
    <div className="home-container" style={{ transition: 'padding 1s', paddingTop: step === 3 ? '20px' : '30vh' }}>
      
      <motion.div 
        className="env-container" 
        onClick={handleOpen}
        animate={step === 0 ? { y: [0, -10, 0] } : { y: 0 }}
        transition={{ repeat: step === 0 ? Infinity : 0, duration: 2, ease: "easeInOut" }}
      >

        {/* 1. COSTAS DO ENVELOPE */}
        <AnimatePresence>
          {step < 3 && (
            <motion.div
              className="env-back"
              exit={{ y: 300, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>

        {/* 2. O CARTÃO OFICIAL */}
        <motion.div
          className="invite-card"
          layout
          initial={{ width: 300, height: 180, borderRadius: 12, padding: 20, y: 15 }}
          animate={
            step === 0 ? { y: 15 } :
            step === 1 ? { y: 15 } :
            step === 2 ? { y: -130 } : 
            step === 3 ? { width: '100%', maxWidth: 500, height: 'auto', borderRadius: 24, padding: 40, y: 0 } : {} 
          }
          transition={{
            layout: { type: "spring", stiffness: 70, damping: 14 },
            y: { type: "spring", stiffness: 80, damping: 15 }
          }}
        >
          <motion.header layout style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div layout className="badge">01 aninho</motion.div>
            <motion.h1 layout className="title-name" style={{ margin: '10px 0 0 0' }}>Júlia Rosa</motion.h1>
          </motion.header>

          <AnimatePresence>
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.4, duration: 0.6 }}
                style={{ width: '100%', marginTop: '30px' }}
              >
                <div className="intro-text">
                  <p><em>Era uma vez...</em> uma princesinha muito amada que está prestes a completar seu primeiro aninho de vida! 🍎</p>
                  <p>Você é nosso convidado de honra para fazer parte deste lindo conto de fadas. Traga sua alegria e venha se divertir com a gente!</p>
                </div>

                <section className="details-grid">
                  <div className="detail-item">
                    <div className="detail-icon"><CalendarHeart size={24} /></div>
                    <div className="detail-text"><strong>Data</strong><span>12 de Outubro (Feriado)</span></div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-icon"><Clock size={24} /></div>
                    <div className="detail-text"><strong>Horário</strong><span>Às 13 horas</span></div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-icon"><MapPin size={24} /></div>
                    <div className="detail-text"><strong>Local</strong><span>Cantinho da Diversão</span></div>
                  </div>
                </section>

                <div className="map-container">
                  <iframe src={mapsUrl} allowFullScreen={false} loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                </div>

                <hr className="divider" />
                <RsvpForm />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 3. FRENTE E ABA DO ENVELOPE */}
        <AnimatePresence>
          {step < 3 && (
            <>
              <motion.div
                className="env-front"
                exit={{ y: 300, opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <motion.div
                className="env-flap"
                initial={{ rotateX: 0, zIndex: 4 }}
                animate={{ 
                  rotateX: step >= 1 ? 180 : 0, 
                  // A MÁGICA ESTÁ AQUI: Vai para trás da carta (z-index 1) assim que a carta começa a subir (step 2)
                  zIndex: step >= 2 ? 1 : 4 
                }} 
                exit={{ y: 300, opacity: 0, scale: 0.8 }}
                transition={{ 
                  rotateX: { duration: 0.4 }, 
                  exit: { duration: 0.6 },
                  zIndex: { duration: 0 } // Troca o z-index instantaneamente sem transição de delay
                }}
              />
            </>
          )}
        </AnimatePresence>

        {/* 4. TEXTO PISCANDO */}
        <AnimatePresence>
          {step === 0 && (
            <motion.div
              className="envelope-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              🍎 Toque para abrir
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}