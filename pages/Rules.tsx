
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, Skull, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { RuleCategory, Rule } from '../types';
import { useLanguage } from '../LanguageContext';

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
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    const { data: catData } = await supabase
      .from('rule_categories')
      .select('*')
      .order('created_at', { ascending: true });

    const { data: rulesData } = await supabase
      .from('rules')
      .select('*')
      .order('order', { ascending: true });

    if (catData) {
      setCategories(catData);
      setActiveTab(catData[0]?.id || null);
    }
    if (rulesData) setRules(rulesData);
    setLoading(false);
  };

  const getRulesByCategory = (categoryId: number) => {
    return rules.filter(r => r.category_id === categoryId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-32 pb-24 bg-luxury-dark min-h-screen"
    >
      <div className="max-w-5xl mx-auto px-6">
        <header className="text-center mb-16">
          <h2 className="font-cinzel text-4xl md:text-5xl font-black mb-4">{t('rules.title')}</h2>
          <p className="text-gray-400 font-light">{t('rules.subtitle')}</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="w-12 h-12 border-4 border-luxury-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Tab Header */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`px-8 py-4 rounded-xl transition-all font-bold uppercase tracking-wider text-sm ${
                    activeTab === category.id 
                      ? 'bg-luxury-gold text-black shadow-lg shadow-luxury-gold/20' 
                      : 'glass text-gray-400 hover:text-white'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="glass rounded-3xl p-8 md:p-12">
              <AnimatePresence mode="wait">
                {activeTab && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                    >
                      {getRulesByCategory(activeTab).length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Aucune règle pour cette catégorie.</p>
                      ) : (
                        getRulesByCategory(activeTab).map((rule, i) => (
                          <motion.div
                            key={rule.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-6 group"
                          >
                            <div className="flex-shrink-0 w-12 h-12 rounded-full border border-luxury-gold/30 flex items-center justify-center text-luxury-gold font-cinzel font-bold">
                              {i + 1}
                            </div>
                            <div>
                              <h3 className="text-xl font-cinzel font-bold text-white mb-2 group-hover:text-luxury-gold transition-colors">{rule.title}</h3>
                              <p className="text-gray-400 leading-relaxed">{rule.content}</p>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-12 p-6 glass rounded-2xl flex items-start gap-4 border-l-4 border-luxury-gold">
              <Info className="text-luxury-gold mt-1 shrink-0" />
              <p className="text-sm text-gray-400 italic">
                Note: Nul n'est censé ignorer le règlement. Les sanctions sont à la discrétion de l'équipe d'administration en fonction de la gravité de l'acte et de l'historique du joueur.
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Rules;
