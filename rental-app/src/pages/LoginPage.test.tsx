import * as fs from 'fs';
import * as path from 'path';

describe('LoginPage', () => {
  const filePath = path.resolve(__dirname, 'LoginPage.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');

  it('exports a default component', () => {
    expect(source).toMatch(/export default LoginPage/);
  });

  it('imports apiClient from config/api', () => {
    expect(source).toMatch(/import\s+\{[^}]*apiClient[^}]*\}\s+from\s+['"]\.\.\/config\/api['"]/);
  });

  it('calls apiClient.post for login', () => {
    expect(source).toMatch(/apiClient\.post\(\s*['"]\/auth\/login['"]/);
  });

  it('calls apiClient.post for registration', () => {
    expect(source).toMatch(/apiClient\.post\(\s*['"]\/auth\/register['"]/);
  });

  it('stores token in localStorage as authToken', () => {
    expect(source).toMatch(/localStorage\.setItem\(\s*['"]authToken['"]/);
  });

  it('does not contain TODO comments for auth logic', () => {
    expect(source).not.toMatch(/TODO.*[Ii]mplement.*auth/);
  });
});
