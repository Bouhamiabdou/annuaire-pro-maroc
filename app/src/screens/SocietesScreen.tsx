import React, { useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { S, C } from '../theme';
import { Bouton, Chargement, Chips, ListeResultats, LiensDirects } from '../components/ui';
import { Lien, liensSociete } from '../liens';
import { MODES_SOCIETE, ModeSociete, iceValide, normaliser, valider } from '../validators';
import { TRIBUNAUX } from '../sources';
import { lireDocument, rechercherSociete, Extraction, ErreurMoteur } from '../engine';
import { ajouterHistorique } from '../storage';
import { Fiche } from '../types';

export default function SocietesScreen({ onOpen }: { onOpen: (f: Fiche) => void }) {
  const [mode, setMode] = useState<ModeSociete>('ice');
  const [valeur, setValeur] = useState('');
  const [tribunal, setTribunal] = useState('Casablanca');
  const [etat, setEtat] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [message, setMessage] = useState<string>();
  const [lu, setLu] = useState<Extraction | null>(null);
  const [liens, setLiens] = useState<Lien[]>([]);

  const modeDef = MODES_SOCIETE.find(m => m.id === mode)!;

  /** Action principale : ouvre la recherche dans les annuaires (gratuit, sans IA). */
  function ouvrir(m = mode, v = valeur) {
    const err = valider(m, v);
    if (err) { setErreur(err); return; }
    setErreur(null); setFiches([]); setMessage(undefined);
    setLiens(liensSociete(normaliser(m, v), m !== 'nom' && m !== 'adresse'));
  }

  async function lancer(m = mode, v = valeur) {
    const err = valider(m, v);
    if (err) { setErreur(err); return; }
    setErreur(null); setFiches([]); setMessage(undefined); setLiens([]);
    setEtat('Recherche dans les annuaires…');
    const val = normaliser(m, v);
    try {
      const r = await rechercherSociete({ mode: m, valeur: val, tribunal: m === 'rc' ? tribunal : undefined });
      setFiches(r.resultats);
      setMessage(r.message || (r.resultats.length ? undefined : 'Aucun résultat. Utilisez les liens vers les annuaires.'));
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
      if (ex.ice && iceValide(ex.ice)) { setMode('ice'); setValeur(ex.ice); ouvrir('ice', ex.ice); }
      else if (ex.ice) {
        // Lecture douteuse : la clé de contrôle ne tombe pas juste. On laisse corriger, et on propose le nom.
        setMode('ice'); setValeur(ex.ice);
        setErreur("ICE lu de façon incertaine (clé de contrôle invalide). Corrigez les chiffres d'après le ticket" +
          (ex.raison_sociale ? ', ou utilisez la recherche par nom ci-dessous.' : '.'));
        if (ex.raison_sociale) setLiens(liensSociete(ex.raison_sociale, false));
      }
      else if (ex.rc) { setMode('rc'); setValeur(ex.rc); ouvrir('rc', ex.rc); }
      else if (ex.raison_sociale) { setMode('nom'); setValeur(ex.raison_sociale); ouvrir('nom', ex.raison_sociale); }
      else setErreur('Aucun identifiant lisible sur le document.');
    } catch (e: any) {
      setErreur(e?.message ?? String(e));
      setEtat(null);
    }
  }

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
      <Text style={S.h1}>Sociétés</Text>
      <Text style={S.hint}>Photographiez un ticket ou saisissez un identifiant : l'application ouvre la fiche dans les annuaires.</Text>

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
        onSubmitEditing={() => ouvrir()}
      />

      {mode === 'rc' && (
        <>
          <Text style={S.label}>Tribunal de commerce (pour la fiche automatique)</Text>
          <Chips items={TRIBUNAUX.map(t => ({ id: t, label: t }))} value={tribunal} onChange={setTribunal} />
        </>
      )}


      <View style={[S.row, { marginTop: 16 }]}>
        <Bouton titre="Ouvrir dans les annuaires" onPress={() => ouvrir()} disabled={!!etat} />
      </View>
      <View style={[S.row, { marginTop: 8 }]}>
        {Platform.OS !== 'web' && <Bouton alt titre="📷 Photo ticket / facture" onPress={() => scanner(true)} disabled={!!etat} />}
        <Bouton alt titre="🖼 Importer une image" onPress={() => scanner(false)} disabled={!!etat} />
      </View>
      <View style={[S.row, { marginTop: 8 }]}>
        <Bouton alt titre="Fiche automatique (essai, moins fiable)" onPress={() => lancer()} disabled={!!etat} />
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
      <LiensDirects liens={liens} titre="Ouvrir la fiche dans un annuaire" />
      <ListeResultats fiches={fiches} message={message} onOpen={onOpen} />
    </ScrollView>
  );
}
