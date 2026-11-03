import 'package:flutter_test/flutter_test.dart';
import 'package:lce_livreur/main.dart';

void main() {
  testWidgets('la bascule de disponibilité change le libellé', (tester) async {
    await tester.pumpWidget(const ApplicationLivreur());
    expect(find.text('Disponible pour des livraisons'), findsOneWidget);
    await tester.tap(find.text('Disponible pour des livraisons'));
    await tester.pump();
    expect(find.text('Indisponible'), findsOneWidget);
  });
}
