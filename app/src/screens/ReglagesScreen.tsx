import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, TextInput, View } from 'react-native';
import { S, C } from '../theme';
import { Bouton } from '../components/ui';
import { ecrireReglages, lireReglages } from '../storage';
import { testerCle } from '../engine';
import { PROFESSIONS, SOURCES_SOCIETES, MODELE_PAR_DEFAUT } from '../sources';

export default function ReglagesScreen({ onSaved }: { onSaved: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(MODELE_PAR_DEFAUT);
  const [extra, setExtra] = useState('');
  const [statut, setStatut] = useState<{ ok: boolean; txt: string } | null>(null);

  useEffect(() => {
    lireReglages().then(r => { setApiKey(r.apiKey); setModel(r.model); setExtra(r.extraDomains.join('\n')); });
  }, []);

  const domaines = () => extra.split(/[\s,;]+/).map(d => d.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean);

  async function enregistrer(tester: boolean) {
    await ecrireReglages({ apiKey, model, extraDomains: domaines() });
    onSaved();
    if (!tester) { setStatut({ ok: true, txt: 'Réglages enregistrés.' }); return; }
    setStatut({ ok: true, txt: 'Test en cours…' });
    try {
      await testerCle();
      setStatut({ ok: true, txt: 'Clé valide. L’application est prête.' });
    } catch (e: any) {
      setStatut({ ok: false, txt: e?.message ?? String(e) });
    }
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
      <Text style={S.h1}>Réglages</Text>

      <Text style={S.label}>Clé API Anthropic</Text>
      <TextInput style={S.input} value={apiKey} onChangeText={setApiKey} placeholder="sk-ant-…" placeholderTextColor={C.muted}
        secureTextEntry autoCapitalize="none" autoCorrect={false} />
      <Text style={[S.hint, { marginTop: 6 }]}>
        Stockée uniquement sur cet appareil. Les recherches partent directement de l’appareil vers l’API, sans serveur intermédiaire.
      </Text>
      <Text style={{ color: C.primary, fontSize: 13 }} onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}>
        Obtenir une clé sur console.anthropic.com ›
      </Text>

      <Text style={S.label}>Modèle</Text>
      <TextInput style={S.input} value={model} onChangeText={setModel} autoCapitalize="none" autoCorrect={false} />

      <Text style={S.label}>Domaines supplémentaires</Text>
      <TextInput style={[S.input, { minHeight: 80, textAlignVertical: 'top' }]} value={extra} onChangeText={setExtra} multiline
        placeholder={'un domaine par ligne, ex.\nmonannuaire.ma'} placeholderTextColor={C.muted} autoCapitalize="none" />

      <View style={[S.row, { marginTop: 16 }]}>
        <Bouton titre="Enregistrer et tester" onPress={() => enregistrer(true)} />
        <Bouton alt titre="Enregistrer" onPress={() => enregistrer(false)} />
      </View>
      {statut && <Text style={{ marginTop: 10, color: statut.ok ? C.primary : C.danger }}>{statut.txt}</Text>}

      <Text style={[S.label, { marginTop: 24 }]}>Sources interrogées</Text>
      <View style={S.card}>
        <Text style={{ fontWeight: '600', color: C.text }}>Sociétés</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{SOURCES_SOCIETES.join(' · ')}</Text>
        {PROFESSIONS.map(p => (
          <Text key={p.id} style={{ fontSize: 12, color: C.muted }}>
            <Text style={{ color: C.text }}>{p.label} : </Text>{p.sources.join(' · ')}
          </Text>
        ))}
      </View>
      <Text style={[S.hint, { marginTop: 10, fontSize: 11 }]}>
        Annuaire Pro Maroc · données publiques, à vérifier auprès des registres officiels pour tout usage administratif.
      </Text>
    </ScrollView>
  );
}
