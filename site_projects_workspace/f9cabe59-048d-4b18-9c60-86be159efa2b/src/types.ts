export interface MemoryMilestone {
  id: string;
  title: string;
  date: string;
  description: string;
  tag: string;
  icon: string;
}

export interface ReasonCard {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export interface PhotoMemory {
  id: string;
  url: string;
  caption: string;
  date: string;
}

export interface BirthdayConfig {
  name: string;
  birthdayDate: string; // YYYY-MM-DD
  messageTitle: string;
  messageContent: string;
  surpriseTitle: string;
  surpriseMessage: string;
  photos: PhotoMemory[];
  milestones: MemoryMilestone[];
  reasons: ReasonCard[];
}
