import { BirthdayConfig } from './types';

export const defaultBirthdayConfig: BirthdayConfig = {
  name: "Alex",
  birthdayDate: "2026-10-15",
  messageTitle: "A Little Message For You 💌",
  messageContent: "To the most incredible person, happy birthday! You bring so much light, warmth, and laughter into every room you step into. Thank you for being such an authentic, compassionate, and hilarious friend. May this year bring you endless happiness, adventure, peace, and all the dreams your heart holds!",
  surpriseTitle: "SURPRISE! 🎉✨",
  surpriseMessage: "Your special birthday gift includes an all-expenses paid weekend getaway & front-row concert tickets to your favorite artist! Get ready for an unforgettable trip!",
  photos: [
    {
      id: "1",
      url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop",
      caption: "Unforgettable Birthday Sunset",
      date: "Summer 2025"
    },
    {
      id: "2",
      url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop",
      caption: "Spontaneous Roadtrip Laughs",
      date: "Spring 2025"
    },
    {
      id: "3",
      url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=800&auto=format&fit=crop",
      caption: "Celebration Fireworks",
      date: "New Year's Eve"
    },
    {
      id: "4",
      url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
      caption: "Late Night Jam Sessions",
      date: "Autumn 2025"
    }
  ],
  milestones: [
    {
      id: "m1",
      title: "The First Memory 🌟",
      date: "March 2021",
      description: "That unforgettable afternoon where we talked for 4 hours straight about life, music, and absurd memes.",
      tag: "Beginning",
      icon: "Sparkles"
    },
    {
      id: "m2",
      title: "The Funniest Moment 😂",
      date: "July 2023",
      description: "When we got lost in the rain, completely soaked, and couldn't stop wheezing with laughter at the gas station.",
      tag: "Comedy",
      icon: "Laugh"
    },
    {
      id: "m3",
      title: "That One Crazy Day 🚀",
      date: "October 2024",
      description: "The spontaneous 3 AM road trip to watch the sunrise over the mountains with warm coffee.",
      tag: "Adventure",
      icon: "Compass"
    },
    {
      id: "m4",
      title: "Today & Forever ❤️",
      date: "Today",
      description: "Celebrating another golden milestone year of incredible growth, joy, and unconditional friendship.",
      tag: "Milestone",
      icon: "Heart"
    }
  ],
  reasons: [
    { id: "r1", emoji: "😊", title: "Your Radiance", description: "Your smile instantly brightens up any room and shifts the mood of everyone around you." },
    { id: "r2", emoji: "💖", title: "Unconditional Kindness", description: "You care deeply about others and always listen with patience and understanding." },
    { id: "r3", emoji: "🤪", title: "Hilarious Humor", description: "You have the most infectious, chaotic humor that guarantees teary-eyed laughter." },
    { id: "r4", emoji: "⚡", title: "Unstoppable Energy", description: "Your passion and vibrant energy inspire everyone to dream bigger and live fully." },
    { id: "r5", emoji: "🛡️", title: "Loyal Friend", description: "You stay rock solid through thick and thin, always having our back no matter what." },
    { id: "r6", emoji: "✨", title: "Uniquely YOU", description: "There is truly nobody else like you in the entire universe—100% authentic and wonderful." }
  ]
};
