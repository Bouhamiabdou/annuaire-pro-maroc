import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { S, C } from '../theme';
import { Bouton, Chargement, Chips, Interrupteur, ListeResultats } from '../components/ui';
import { PROFESSIONS } from '../sources';
import { rechercherPro } from '../engine';
import { ajouterHistorique } from '../storage';
import { Fiche } from '../types';

export default function ProsScreen({ onOpen }: { onOpen: (f: Fiche) => void }) {
  const [prof, setProf] = useState('medecin');
  const [nom, setNom] = useState('');
  const [specialite, setSpecialite] = useState('');
  const [ville, setVille] = useState('');
  const [numero, setNumero] = useState('');
  const [webEntier, setWebEntier] = useState(false);
  const [etat, setEtat] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [message, setMessage] = useState<string>();

  const label = PROFESSIONS.find(p => p.id === prof)!.label;
  const avecSpecialite = ['medecin', 'dentiste', 'avocat', 'architecte'].includes(prof);

  async function lancer() {
    if (![nom, specialite, ville, numero].some(s => s.trim())) {
      setErreur('Renseignez au moins un critère (nom, spécialité, ville ou numéro).');
      return;
    }
    setErreur(null); setFiches([]); setMessage(undefined);
    setEtat(`Recherche : ${label.toLowerCase()}…`);
    try {
      const r = await rechercherPro({
        professionId: prof, nom: nom.trim(), specialite: specialite.trim(),
        ville: ville.trim(), numero: numero.trim(), webEntier,
      });
      setFiches(r.resultats);
      setMessage(r.message || (r.resultats.length ? undefined : 'Aucun résultat. Essayez « Élargir à tout le web ».'));
      const req = [label, nom, specialite, ville, numero].filter(s => s.trim()).join(' · ');
      if (r.resultats.length) await ajouterHistorique(req, r.resultats);
    } catch (e: any) {
      setErreur(e?.message ?? String(e));
    } finally {
      setEtat(null);
    }
  }

  const champ = (titre: string, v: string, set: (s: string) => void, ph: string) => (
    <>
      <Text style={S.label}>{titre}</Text>
      <TextInput style={S.input} value={v} onChangeText={set} placeholder={ph} placeholderTextColor={C.muted}
        returnKeyType="search" onSubmitEditing={lancer} />
    </>
  );

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
      <Text style={S.h1}>Professionnels</Text>
      <Text style={S.hint}>Annuaires des ordres, barreaux et répertoires publics. Données professionnelles uniquement.</Text>

      <Chips items={PROFESSIONS.map(p => ({ id: p.id, label: p.label }))} value={prof} onChange={setProf} />

      {champ('Nom', nom, setNom, 'ex. Benali')}
      {avecSpecialite && champ('Spécialité', specialite, setSpecialite,
        prof === 'avocat' ? 'ex. droit des affaires' : prof === 'architecte' ? 'ex. urbanisme' : 'ex. cardiologue')}
      {champ('Ville ou quartier', ville, setVille, 'ex. Casablanca, Aïn Chock')}
      {champ("N° d'inscription", numero, setNumero, 'Ordre / barreau')}

      <Interrupteur label="Élargir à tout le web" aide="Par défaut : sources propres à la profession" value={webEntier} onChange={setWebEntier} />

      <View style={[S.row, { marginTop: 16 }]}>
        <Bouton titre="Rechercher" onPress={lancer} disabled={!!etat} />
      </View>

      {erreur && <Text style={S.error}>{erreur}</Text>}
      {etat && <Chargement texte={etat} />}
      <ListeResultats fiches={fiches} message={message} onOpen={onOpen} />
    </ScrollView>
  );
}
