import React, { useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { S, C } from '../theme';
import { Bouton, Chargement, Chips, Interrupteur, ListeResultats, LiensDirects } from '../components/ui';
import { Lien, liensSociete } from '../liens';
import { MODES_SOCIETE, ModeSociete, normaliser, valider } from '../validators';
import { TRIBUNAUX } from '../sources';
import { lireDocument, rechercherSociete, Extraction, ErreurMoteur } from '../engine';
import { ajouterHistorique } from '../storage';
import { Fiche } from '../types';

export default function SocietesScreen({ onOpen }: { onOpen: (f: Fiche) => void }) {
  const [mode, setMode] = useState<ModeSociete>('ice');
  const [valeur, setValeur] = useState('');
  const [tribunal, setTribunal] = useState('Casablanca');
  const [webEntier, setWebEntier] = useState(false);
  const [etat, setEtat] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [message, setMessage] = useState<string>();
  const [lu, setLu] = useState<Extraction | null>(null);
  const [liens, setLiens] = useState<Lien[]>([]);

  const modeDef = MODES_SOCIETE.find(m => m.id === mode)!;

  async function lancer(m = mode, v = valeur) {
    const err = valider(m, v);
    if (err) { setErreur(err); return; }
    setErreur(null); setFiches([]); setMessage(undefined); setLiens([]);
    setEtat('Recherche dans les annuaires…');
    const val = normaliser(m, v);
    try {
      const r = await rechercherSociete({ mode: m, valeur: val, tribunal: m === 'rc' ? tribunal : undefined, webEntier });
      setFiches(r.resultats);
      setMessage(r.message || (r.resultats.length ? undefined : 'Aucun résultat. Essayez « Élargir à tout le web » ou la recherche directe.'));
      if (r.resultats.length) await ajouterHistorique(`${modeDef.label} ${val}`, r.resultats);
      else setLiens(liensSociete(val));
    } catch (e: any) {
      setErreur(e?.message ?? String(e));
      if (e instanceof ErreurMoteur && e.quota) setLiens(liensSociete(val));
    } finally {
      setEtat(null);
    }
  }

  async function scanner(camera: boolean) {
    setErreur(null); setLu(null);
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.6 };
    let res: ImagePicker.ImagePickerResult;
    if (camera && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setErreur("Autorisez l'accès à l'appareil photo."); return; }
      res = await ImagePicker.launchCameraAsync(opts);
    } else {
      res = await ImagePicker.launchImageLibraryAsync(opts);
    }
    const a = res.canceled ? null : res.assets[0];
    if (!a?.base64) return;
    setEtat('Lecture du document…');
    try {
      const ex = await lireDocument(a.base64, a.mimeType ?? 'image/jpeg');
      setLu(ex);
      setEtat(null);
      if (ex.ice && ex.ice.length === 15) { setMode('ice'); setValeur(ex.ice); await lancer('ice', ex.ice); }
      else if (ex.rc) { setMode('rc'); setValeur(ex.rc); await lancer('rc', ex.rc); }
      else if (ex.raison_sociale) { setMode('nom'); setValeur(ex.raison_sociale); await lancer('nom', ex.raison_sociale); }
      else setErreur('Aucun identifiant lisible sur le document.');
    } catch (e: any) {
      setErreur(e?.message ?? String(e));
      setEtat(null);
    }
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
      <Text style={S.h1}>Sociétés</Text>
      <Text style={S.hint}>Recherche par ICE, RC, IF, raison sociale, téléphone ou adresse.</Text>

      <Chips items={MODES_SOCIETE} value={mode} onChange={m => { setMode(m); setErreur(null); }} />

      <Text style={S.label}>{modeDef.label}</Text>
      <TextInput
        style={S.input}
        value={valeur}
        onChangeText={setValeur}
        placeholder={modeDef.placeholder}
        placeholderTextColor={C.muted}
        keyboardType={['ice', 'rc', 'if', 'tel'].includes(mode) ? 'number-pad' : 'default'}
        returnKeyType="search"
        onSubmitEditing={() => lancer()}
      />

      {mode === 'rc' && (
        <>
          <Text style={S.label}>Tribunal de commerce</Text>
          <Chips items={TRIBUNAUX.map(t => ({ id: t, label: t }))} value={tribunal} onChange={setTribunal} />
        </>
      )}

      <Interrupteur
        label="Élargir à tout le web"
        aide="Par défaut : annuaires d'entreprises uniquement"
        value={webEntier}
        onChange={setWebEntier}
      />

      <View style={[S.row, { marginTop: 16 }]}>
        <Bouton titre="Rechercher" onPress={() => lancer()} disabled={!!etat} />
      </View>
      <View style={[S.row, { marginTop: 8 }]}>
        {Platform.OS !== 'web' && <Bouton alt titre="📷 Photo ticket / facture" onPress={() => scanner(true)} disabled={!!etat} />}
        <Bouton alt titre="🖼 Importer une image" onPress={() => scanner(false)} disabled={!!etat} />
      </View>

      {lu && (
        <View style={[S.card, { backgroundColor: C.primaryLight }]}>
          <Text style={{ fontWeight: '600', color: C.primary, marginBottom: 4 }}>Lu sur le document</Text>
          {Object.entries(lu).map(([k, v]) => (
            <Text key={k} style={{ fontSize: 13, color: C.text }}>{k.replace('_', ' ')} : {v}</Text>
          ))}
        </View>
      )}

      {erreur && <Text style={S.error}>{erreur}</Text>}
      {etat && <Chargement texte={etat} />}
      <ListeResultats fiches={fiches} message={message} onOpen={onOpen} />
      <LiensDirects liens={liens} />
    </ScrollView>
  );
}
