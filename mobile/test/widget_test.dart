import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Basic test passes', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Text('Test'))));
    expect(find.text('Test'), findsOneWidget);
  });
}
