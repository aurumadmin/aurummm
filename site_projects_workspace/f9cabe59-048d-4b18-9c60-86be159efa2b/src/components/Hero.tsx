import React from 'react';

export default function Hero({ prompt }: { prompt: string }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 text-center space-y-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono uppercase tracking-widest">
        <span>✨ Next-Gen AI Workspace</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
        Multi-File Project Generated for <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">Create a beautiful, interactive, premium birthday celebration website.

## Overall Concept

Build the website as a **personalized digital birthday experience**, not a basic landing page. It should feel emotional, magical, modern, and memorable, with smooth animations and a polished Gen-Z aesthetic.

### Theme

* Elegant + dreamy + romantic/friendly depending on the content
* Dark-to-purple/pink gradient background with subtle glowing particles
* Glassmorphism cards
* Soft neon glow effects
* Premium typography
* Smooth scrolling
* Subtle 3D/parallax effects
* Fully responsive on mobile, tablet, and desktop

## Hero Section

Create a full-screen opening section with:

**“Happy Birthday, [NAME] 🎂✨”**

Subtitle:
**“Today isn't just another day... it's YOUR day.”**

Add an animated birthday cake / glowing gift box in the center.

Include a large CTA button:
**“Start the Celebration ✨”**

When clicked:

* Trigger a beautiful confetti animation
* Play a subtle celebration animation
* Smoothly scroll to the next section

## Birthday Message

Create a visually beautiful section titled:

**“A Little Message For You 💌”**

Add a large glassmorphism card containing a heartfelt personalized birthday message.

Use animated text appearance as the user scrolls.

## Memories Section

Create an interactive photo gallery titled:

**“Little Moments, Big Memories 📸”**

Display photos in a modern masonry/grid layout.

Features:

* Hover animations
* Image zoom
* Lightbox when clicked
* Smooth transitions
* Optional captions/date labels

Use placeholder images for now and structure the code so they can easily be replaced later.

## Timeline

Create an animated horizontal/vertical timeline called:

**“Our Story ✨”**

Include several milestones such as:

* The First Memory
* The Funniest Moment
* That One Crazy Day
* Favorite Memory
* Today ❤️

Each milestone should animate into view while scrolling.

## Reasons Section

Create a section:

**“Reasons You're Awesome 💜”**

Show 6–8 animated cards containing short compliments/reasons.

Examples:

* Your smile
* Your kindness
* Your crazy sense of humor
* The way you make people happy
* Your energy
* Simply being YOU

Cards should have subtle floating/hover animations.

## Interactive Gift

Create a large interactive gift box section:

**“There's One More Thing... 🎁”**

The gift box should visually open when clicked.

After opening, reveal:

**“SURPRISE! 🎉”**

Then show a personalized message, image, or special content.

Add confetti/fireworks when the gift opens.

## Birthday Countdown

Add a beautiful countdown component:

**“Until Your Next Birthday 🎂”**

Display:
Days | Hours | Minutes | Seconds

Make it live and automatically update every second.

If the birthday date is configurable, keep the date in one obvious variable/configuration location.

## Final Section

Create an emotional final screen with:

**“Here's to another year of amazing memories. 🥂”**

Then:

**“Happy Birthday, [NAME] ❤️”**

Add animated floating hearts, stars, sparkles, and confetti.

Include a final button:

**“Replay the Magic ✨”**

which smoothly returns the user to the beginning.

## Audio

Add optional background music support.

Do NOT autoplay audio without user interaction.

Instead, provide a small floating music button that allows the user to play/pause the birthday music.

## Animations

Use animations extensively but tastefully:

* Scroll reveal
* Fade/slide transitions
* Floating particles
* Glow effects
* Confetti
* Fireworks
* Parallax
* Hover effects
* Smooth page transitions
* Animated counters
* Gift-opening animation

Animations must remain performant and should respect `prefers-reduced-motion`.

## Technical Requirements

* Build with clean, modular code
* Fully responsive
* Mobile-first
* Fast loading
* Semantic HTML
* Accessible buttons and controls
* Keyboard accessible interactions
* No unnecessary dependencies
* Optimize images
* Avoid excessive animation that hurts performance
* Use reusable components
* Keep all customizable birthday information in a clear configuration object

Create configurable fields for:

* Name
* Birthday date
* Birthday message
* Photos
* Timeline memories
* Reasons
* Background music
* Theme colors

## Important

The website should feel like a **real premium interactive birthday microsite**, similar to something a professional creative studio would make.

Do not make it look like a generic template.

Prioritize:

1. Emotional impact
2. Visual quality
3. Smooth interactions
4. Mobile experience
5. Personalization
6. Performance

Use tasteful micro-interactions throughout the experience and make the first 5 seconds of the website visually impressive.
</span>
      </h1>
      <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
        Full modular architecture generated with interactive components, responsive layout navigation, and state handlers.
      </p>
      <div className="flex items-center justify-center gap-4 pt-4">
        <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm shadow-xl shadow-amber-500/25 transition-all">Launch Application</button>
        <button className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl text-sm transition-all">Explore Code Tree</button>
      </div>
    </section>
  );
}