import React from 'react';
import { ActivityIndicator, Linking, Pressable, Switch, Text, View } from 'react-native';
import { Lien } from '../liens';
import { C, S } from '../theme';
import { Fiche } from '../types';
import { sousTitre } from '../champs';
import { titreFiche } from '../types';

export function Chips<T extends string>(p: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={S.row}>
      {p.items.map(it => {
        const on = it.id === p.value;
        return (
          <Pressable key={it.id} onPress={() => p.onChange(it.id)} style={[S.chip, on && S.chipOn]}>
            <Text style={[S.chipTxt, on && S.chipTxtOn]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Bouton(p: { titre: string; onPress: () => void; alt?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={p.onPress}
      disabled={p.disabled}
      style={({ pressed }) => [p.alt ? S.btnAlt : S.btn, (pressed || p.disabled) && { opacity: 0.6 }]}
    >
      <Text style={p.alt ? S.btnAltTxt : S.btnTxt}>{p.titre}</Text>
    </Pressable>
  );
}

export function Interrupteur(p: { label: string; value: boolean; onChange: (v: boolean) => void; aide?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: C.text }}>{p.label}</Text>
        {p.aide ? <Text style={{ fontSize: 12, color: C.muted }}>{p.aide}</Text> : null}
      </View>
      <Switch value={p.value} onValueChange={p.onChange} trackColor={{ true: C.primary, false: C.border }} />
    </View>
  );
}

export function Chargement({ texte }: { texte: string }) {
  return (
    <View style={[S.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <ActivityIndicator color={C.primary} />
      <Text style={{ color: C.muted, flex: 1 }}>{texte}</Text>
    </View>
  );
}

export function ListeResultats(p: { fiches: Fiche[]; message?: string; onOpen: (f: Fiche) => void }) {
  if (!p.fiches.length) {
    return p.message ? <View style={S.card}><Text style={{ color: C.muted }}>{p.message}</Text></View> : null;
  }
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={[S.label, { marginTop: 8 }]}>{p.fiches.length} résultat{p.fiches.length > 1 ? 's' : ''}</Text>
      {p.fiches.map((f, i) => (
        <Pressable key={i} onPress={() => p.onOpen(f)} style={({ pressed }) => [S.card, pressed && { opacity: 0.7 }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.primary }}>{titreFiche(f)}</Text>
          <Text style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{sousTitre(f) || 'Voir la fiche'}</Text>
          {f.kind === 'societe' && f.adresse ? <Text style={{ fontSize: 13, color: C.text, marginTop: 6 }} numberOfLines={2}>{f.adresse}</Text> : null}
          {f.kind === 'pro' && f.adresse_cabinet ? <Text style={{ fontSize: 13, color: C.text, marginTop: 6 }} numberOfLines={2}>{f.adresse_cabinet}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

export function LiensDirects({ liens }: { liens: Lien[] }) {
  if (!liens.length) return null;
  return (
    <View style={[S.card, { backgroundColor: C.primaryLight }]}>
      <Text style={{ fontWeight: '600', color: C.primary, marginBottom: 8 }}>Recherche directe (gratuite, illimitée)</Text>
      <View style={S.row}>
        {liens.map(l => (
          <Pressable key={l.url} onPress={() => Linking.openURL(l.url)} style={S.chip}>
            <Text style={S.chipTxt}>{l.label} ›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
