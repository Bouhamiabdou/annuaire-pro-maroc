import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { C, S } from '../theme';
import { Fiche, titreFiche } from '../types';
import { champs } from '../champs';
import { basculerFavori, estFavori } from '../storage';
import { exporterPdf, partagerTexte } from '../export';
import { Bouton } from './ui';

export default function FicheModal(p: { fiche: Fiche | null; onClose: () => void; onFavChange?: () => void }) {
  const f = p.fiche;
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (f) estFavori(f).then(setFav);
  }, [f]);

  if (!f) return null;

  const appeler = (tel: string) => Linking.openURL(`tel:${tel.replace(/[^\d+]/g, '')}`);

  return (
    <Modal visible animationType="slide" onRequestClose={p.onClose} transparent={false}>
      <View style={S.screen}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 44, backgroundColor: C.primary }}>
          <Pressable onPress={p.onClose} hitSlop={12}><Text style={{ color: '#fff', fontSize: 16 }}>‹ Retour</Text></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            hitSlop={12}
            onPress={async () => { setFav(await basculerFavori(f)); p.onFavChange?.(); }}
          >
            <Text style={{ color: fav ? C.accent : '#fff', fontSize: 22 }}>{fav ? '★' : '☆'}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={S.content}>
          <Text style={S.h1}>{titreFiche(f)}</Text>
          <Text style={S.hint}>{f.kind === 'societe' ? 'Fiche société' : 'Fiche professionnel'}</Text>

          <View style={S.card}>
            {champs(f).map(([l, v]) => {
              const tel = l.startsWith('Téléphone');
              return (
                <View key={l} style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.bg }}>
                  <Text style={{ width: 130, color: C.muted, fontSize: 13 }}>{l}</Text>
                  <Text
                    selectable
                    onPress={tel ? () => appeler(v) : undefined}
                    style={{ flex: 1, fontSize: 14, color: tel ? C.primary : C.text, fontWeight: l === 'ICE' || l === 'RC' ? '700' : '400' }}
                  >
                    {v}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={S.label}>Sources</Text>
          {f.sources.length ? f.sources.map((s, i) => (
            <Pressable key={i} onPress={() => Linking.openURL(s.url)} style={[S.card, { marginTop: 6, padding: 10 }]}>
              <Text style={{ color: C.primary, fontSize: 13 }} numberOfLines={1}>{s.titre || s.url}</Text>
              <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={1}>{s.url}</Text>
            </Pressable>
          )) : <Text style={S.hint}>Aucune source renvoyée.</Text>}

          <View style={[S.row, { marginTop: 18 }]}>
            <Bouton titre="Exporter en PDF" onPress={() => exporterPdf(f)} />
            <Bouton titre="Partager" alt onPress={() => partagerTexte(f)} />
          </View>
          <Text style={[S.hint, { marginTop: 14, fontSize: 11 }]}>
            Informations issues de sources publiques en ligne. Pour un usage officiel, vérifiez auprès du registre du commerce (OMPIC) ou de l'ordre professionnel compétent.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
