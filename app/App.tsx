import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { C } from './src/theme';
import { Fiche } from './src/types';
import SocietesScreen from './src/screens/SocietesScreen';
import ProsScreen from './src/screens/ProsScreen';
import HistoriqueScreen from './src/screens/HistoriqueScreen';
import FicheModal from './src/components/FicheModal';

type Onglet = 'societes' | 'pros' | 'fiches';

const ONGLETS: { id: Onglet; label: string; icone: string }[] = [
  { id: 'societes', label: 'Sociétés', icone: '🏢' },
  { id: 'pros', label: 'Professionnels', icone: '⚖️' },
  { id: 'fiches', label: 'Mes fiches', icone: '★' },
];

export default function App() {
  const [onglet, setOnglet] = useState<Onglet>('societes');
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [version, setVersion] = useState(0);
  const { width } = useWindowDimensions();
  const large = width >= 900;

  const rafraichir = () => setVersion(v => v + 1);

  const ecran = (() => {
    switch (onglet) {
      case 'societes': return <SocietesScreen onOpen={setFiche} />;
      case 'pros': return <ProsScreen onOpen={setFiche} />;
      case 'fiches': return <HistoriqueScreen onOpen={setFiche} version={version} />;
    }
  })();

  const barre = (
    <View style={large
      ? { width: 220, backgroundColor: C.primary, paddingTop: 24 }
      : { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: 18 }}>
      {large && <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 18, marginBottom: 20 }}>Annuaire Pro Maroc</Text>}
      {ONGLETS.map(o => {
        const on = o.id === onglet;
        return (
          <Pressable
            key={o.id}
            onPress={() => { setOnglet(o.id); if (o.id === 'fiches') rafraichir(); }}
            style={large
              ? { paddingVertical: 12, paddingHorizontal: 18, backgroundColor: on ? 'rgba(255,255,255,0.15)' : 'transparent' }
              : { flex: 1, alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={large
              ? { color: '#fff', fontSize: 15, fontWeight: on ? '700' : '400' }
              : { fontSize: 18, opacity: on ? 1 : 0.5 }}>
              {large ? `${o.icone}  ${o.label}` : o.icone}
            </Text>
            {!large && <Text style={{ fontSize: 11, color: on ? C.primary : C.muted, fontWeight: on ? '700' : '400' }}>{o.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, flexDirection: large ? 'row' : 'column' }}>
      <StatusBar style={large ? 'auto' : 'light'} />
      {large ? barre : (
        <View style={{ backgroundColor: C.primary, paddingTop: 44, paddingBottom: 12, paddingHorizontal: 16 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Annuaire Pro Maroc</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>{ecran}</View>
      {!large && barre}
      <FicheModal fiche={fiche} onClose={() => setFiche(null)} onFavChange={rafraichir} />
    </View>
  );
}
