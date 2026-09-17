// src/services/whatsapp.ts

export const sendInviteWhatsApp = (nomeConvidado: string, telefone: string) => {
  // O link real do seu site (após publicarmos)
  const siteUrl = "https://convite-julia.com.br"; 
  
  // Limpa o telefone para garantir que só tenha números
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  const text = `Olá, *${nomeConvidado}*! 🍎\n\nEstamos muito felizes em te convidar para o 1º aninho da Júlia Rosa!\n\nPor favor, confirme sua presença (ou nos avise caso não possa ir) através do nosso site:\n${siteUrl}`;
  
  const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};