// src/types/guest.ts
export type RsvpStatus = 'confirmado' | 'recusado' | 'pendente';

export interface Guest {
  id?: string;
  nomeFamilia: string;
  telefone?: string;
  adultos: string[]; // Agora é uma lista de nomes
  criancas: string[]; // Agora é uma lista de nomes
  status: RsvpStatus;
  data_confirmacao?: Date;
}