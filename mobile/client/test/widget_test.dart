import 'package:flutter_test/flutter_test.dart';
import 'package:lce_client/main.dart';

void main() {
  testWidgets('ajouter un produit incrémente la pastille du panier', (tester) async {
    await tester.pumpWidget(const ApplicationClient());
    expect(find.text('Panier'), findsOneWidget);
    await tester.tap(find.byTooltip('Ajouter Crème au karité pur au panier'));
    await tester.pump();
    expect(find.text('1'), findsOneWidget);
  });
}
