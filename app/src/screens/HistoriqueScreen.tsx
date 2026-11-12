import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { S, C } from '../theme';
import { Chips } from '../components/ui';
import { Entree, Fiche, titreFiche } from '../types';
import { lireFavoris, lireHistorique, viderHistorique } from '../storage';
import { sousTitre } from '../champs';

export default function HistoriqueScreen({ onOpen, version }: { onOpen: (f: Fiche) => void; version: number }) {
  const [onglet, setOnglet] = useState<'hist' | 'fav'>('fav');
  const [liste, setListe] = useState<Entree[]>([]);
  const [filtre, setFiltre] = useState<'tous' | 'societe' | 'pro'>('tous');

  const charger = useCallback(async () => {
    setListe(onglet === 'hist' ? await lireHistorique() : await lireFavoris());
  }, [onglet]);

  useEffect(() => { charger(); }, [charger, version]);

  const visibles = liste.filter(e => filtre === 'tous' || e.fiche.kind === filtre);

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content}>
      <Text style={S.h1}>Mes fiches</Text>
      <Chips items={[{ id: 'fav', label: '★ Favoris' }, { id: 'hist', label: 'Historique' }]} value={onglet} onChange={setOnglet} />
      <View style={{ height: 8 }} />
      <Chips items={[{ id: 'tous', label: 'Tout' }, { id: 'societe', label: 'Sociétés' }, { id: 'pro', label: 'Professionnels' }]} value={filtre} onChange={setFiltre} />

      {!visibles.length && (
        <Text style={[S.hint, { marginTop: 20 }]}>
          {onglet === 'fav' ? 'Aucun favori. Ouvrez une fiche et touchez ☆.' : 'Aucune recherche enregistrée.'}
        </Text>
      )}

      {visibles.map(e => (
        <Pressable key={e.id} onPress={() => onOpen(e.fiche)} style={({ pressed }) => [S.card, pressed && { opacity: 0.7 }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.primary }}>{titreFiche(e.fiche)}</Text>
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sousTitre(e.fiche)}</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            {new Date(e.date).toLocaleString('fr-MA')} · {e.requete}
          </Text>
        </Pressable>
      ))}

      {onglet === 'hist' && liste.length > 0 && (
        <Pressable onPress={async () => { await viderHistorique(); charger(); }} style={{ marginTop: 20, alignSelf: 'center' }}>
          <Text style={{ color: C.danger }}>Vider l'historique</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
