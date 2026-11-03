import 'package:flutter/material.dart';

import '../jetons.g.dart';

/// Bascule on / off (ex. « Disponible » du livreur). Verte quand active,
/// toujours avec un libellé lu par les lecteurs d'écran.
class LceBascule extends StatelessWidget {
  const LceBascule({super.key, required this.active, required this.libelle, required this.onChanged});

  final bool active;
  final String libelle;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    return MergeSemantics(
      child: SwitchListTile(
        value: active,
        onChanged: onChanged,
        title: Text(libelle, style: TextesLce.body),
        activeThumbColor: CouleursLce.surface,
        activeTrackColor: CouleursLce.success,
        inactiveThumbColor: CouleursLce.surface,
        inactiveTrackColor: CouleursLce.line,
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
        contentPadding: EdgeInsets.zero,
      ),
    );
  }
}
