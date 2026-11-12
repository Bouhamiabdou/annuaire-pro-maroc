import { StyleSheet } from 'react-native';

export const C = {
  primary: '#0b4f6c',
  primaryLight: '#e3eff5',
  accent: '#c8902a',
  bg: '#f5f7f9',
  card: '#ffffff',
  text: '#1b2430',
  muted: '#6b7785',
  border: '#dde4ea',
  danger: '#b3261e',
};

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 820, alignSelf: 'center' },
  h1: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4 },
  hint: { fontSize: 13, color: C.muted, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.text,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 13, color: C.text },
  chipTxtOn: { color: '#fff', fontWeight: '600' },
  btn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', flexGrow: 1 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnAlt: { backgroundColor: C.card, borderWidth: 1, borderColor: C.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', flexGrow: 1 },
  btnAltTxt: { color: C.primary, fontWeight: '600', fontSize: 14 },
  error: { color: C.danger, fontSize: 13, marginTop: 8 },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 10 },
});
