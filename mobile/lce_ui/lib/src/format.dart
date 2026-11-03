/// Formate un montant entier en FCFA : espace insécable fine comme séparateur
/// de milliers, devise après, sans décimale. 153600 → « 153 600 FCFA ».
String formaterFcfa(num montant) {
  final entier = montant.round();
  final chiffres = entier.abs().toString().replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'),
        (_) => '\u202F',
      );
  return '${entier < 0 ? '-' : ''}$chiffres\u00A0FCFA';
}
