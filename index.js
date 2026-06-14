/**
 * @format
 */
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Suppress non-critical warnings
LogBox.ignoreLogs([
  'Require cycle: node_modules/react-native-',
  '[react-native-gesture-handler]',
]);

AppRegistry.registerComponent(appName, () => App);
