export type RsvpStatus = 'confirmado' | 'recusado' | 'pendente';

export interface Guest {
  id?: string;
  nomeFamilia: string;
  telefone?: string;
  adultos: string[]; 
  criancas: string[]; 
  status: RsvpStatus;
  data_confirmacao?: Date;
}