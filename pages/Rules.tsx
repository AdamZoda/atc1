
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, Skull, Info } from 'lucide-react';

const sections = [
  {
    id: 'general',
    label: 'Général',
    icon: ShieldCheck,
    content: [
      { title: "Fairplay", text: "Le fairplay est la règle d'or d'Atlantic RP. Gagner n'est pas une fin en soi, privilégiez toujours la qualité des scènes." },
      { title: "Respect", text: "Tout manque de respect envers un joueur ou le staff en dehors du RP (OOC) sera sévèrement sanctionné." },
      { title: "HRP Vocale", text: "Interdiction de parler 'Hors RP' en jeu. Utilisez les moyens de communication prévus (Discord) pour les problèmes techniques." }
    ]
  },
  {
    id: 'rp',
    label: 'RP & Immersion',
    icon: User,
    content: [
      { title: "PowerGaming", text: "Interdiction de réaliser des actions physiquement impossibles ou de forcer un scénario sans laisser de chance à l'autre partie." },
      { title: "MetaGaming", text: "Interdiction d'utiliser des informations obtenues en dehors du RP (Discord, Stream) pour influencer vos actions en jeu." },
      { title: "Fear RP", text: "Vous devez impérativement ressentir la peur pour votre vie. Si vous êtes braqué, collaborez." }
    ]
  },
  {
    id: 'illegal',
    label: 'Illégal',
    icon: Skull,
    content: [
      { title: "Revendications", text: "Toute action de grande envergure (braquage, guerre) doit être encadrée et justifiée par un background solide." },
      { title: "Zones Rouges", text: "Certaines zones sont considérées comme dangereuses. L'usage des armes y est toléré mais doit rester cohérent." },
      { title: "Loot Abusif", text: "Le vol d'inventaire doit être raisonnable et justifié par la scène en cours." }
    ]
  }
];

const Rules: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-24 bg-luxury-dark min-h-screen"
    >
      <div className="max-w-5xl mx-auto px-6">
        <header className="text-center mb-16">
          <h2 className="font-cinzel text-4xl md:text-5xl font-black mb-4">RÈGLEMENTS</h2>
          <p className="text-gray-400 font-light">Le socle de notre communauté : respect et immersion.</p>
        </header>

        {/* Tab Header */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl transition-all font-bold uppercase tracking-wider text-sm ${
                activeTab === section.id 
                  ? 'bg-luxury-gold text-black shadow-lg shadow-luxury-gold/20' 
                  : 'glass text-gray-400 hover:text-white'
              }`}
            >
              <section.icon size={20} />
              {section.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="glass rounded-3xl p-8 md:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              {sections.find(s => s.id === activeTab)?.content.map((item, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full border border-luxury-gold/30 flex items-center justify-center text-luxury-gold font-cinzel font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-cinzel font-bold text-white mb-2 group-hover:text-luxury-gold transition-colors">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-12 p-6 glass rounded-2xl flex items-start gap-4 border-l-4 border-luxury-gold">
          <Info className="text-luxury-gold mt-1 shrink-0" />
          <p className="text-sm text-gray-400 italic">
            Note: Nul n'est censé ignorer le règlement. Les sanctions sont à la discrétion de l'équipe d'administration en fonction de la gravité de l'acte et de l'historique du joueur.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Rules;
