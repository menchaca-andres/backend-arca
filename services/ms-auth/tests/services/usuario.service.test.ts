import bcrypt from 'bcryptjs';
import { EstadoFuncionario, RolUsuario } from '@arca/shared';
import { UsuarioService } from '../../src/services/usuario.service';
import { UsuarioRepository } from '../../src/repositories/usuario.repository';
import type { IPersonalClient } from '../../src/clients/personal.client';
import { Usuario } from '../../src/entities/usuario.entity';

describe('UsuarioService (HU-06)', () => {
  let mockRepo: jest.Mocked<UsuarioRepository>;
  let mockPersonalClient: jest.Mocked<IPersonalClient>;
  let service: UsuarioService;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findByFuncionarioId: jest.fn(),
    } as any;

    mockPersonalClient = {
      getFuncionario: jest.fn(),
    };

    service = new UsuarioService(mockRepo, mockPersonalClient);
  });

  describe('CA-02, CA-04 y CA-05: Creación de usuario', () => {
    it('crea un usuario no funcionario exitosamente y genera contraseña temporal', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: 'usr-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const res = await service.crear({
        email: 'admin@arca.test',
        rol: RolUsuario.ADMIN,
      });

      expect(res.usuario.email).toBe('admin@arca.test');
      expect(res.usuario.rol).toBe(RolUsuario.ADMIN);
      expect(res.usuario.funcionarioId).toBeNull();
      expect(res.passwordTemporal).toBeDefined();
      expect(res.passwordTemporal.length).toBeGreaterThanOrEqual(10);

      // Verificar que se guardó con hash
      const guardado = mockRepo.save.mock.calls[0][0];
      expect(guardado.email).toBe('admin@arca.test');
      expect(guardado.passwordHash).toBeDefined();
      expect(await bcrypt.compare(res.passwordTemporal, guardado.passwordHash)).toBe(true);
    });

    it('rechaza si el correo ya existe (CA-04)', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: 'existente' } as Usuario);

      await expect(
        service.crear({
          email: 'admin@arca.test',
          rol: RolUsuario.ADMIN,
        }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });
    });

    it('rechaza rol FUNCIONARIO sin funcionarioId (CA-02)', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.crear({
          email: 'func@arca.test',
          rol: RolUsuario.FUNCIONARIO,
          funcionarioId: null,
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });

    it('rechaza si el funcionario ya tiene cuenta vinculada (CA-04)', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByFuncionarioId.mockResolvedValue({ id: 'otra-cuenta' } as Usuario);

      await expect(
        service.crear({
          email: 'func@arca.test',
          rol: RolUsuario.FUNCIONARIO,
          funcionarioId: '11111111-1111-1111-1111-111111111111',
        }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        status: 409,
      });
    });
  });

  describe('CA-03: Validación contra ms-personal', () => {
    it('rechaza si el funcionario no existe en ms-personal', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByFuncionarioId.mockResolvedValue(null);
      mockPersonalClient.getFuncionario.mockResolvedValue(null);

      await expect(
        service.crear({
          email: 'func@arca.test',
          rol: RolUsuario.FUNCIONARIO,
          funcionarioId: '11111111-1111-1111-1111-111111111111',
        }),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      });
    });

    it('rechaza si el funcionario vinculado está de BAJA', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByFuncionarioId.mockResolvedValue(null);
      mockPersonalClient.getFuncionario.mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        estado: EstadoFuncionario.BAJA,
      } as any);

      await expect(
        service.crear({
          email: 'func@arca.test',
          rol: RolUsuario.FUNCIONARIO,
          funcionarioId: '11111111-1111-1111-1111-111111111111',
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });

    it('permite crear si el funcionario existe y está activo (RATIFICADO o EN_PRUEBA)', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.findByFuncionarioId.mockResolvedValue(null);
      mockPersonalClient.getFuncionario.mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        estado: EstadoFuncionario.RATIFICADO,
      } as any);
      mockRepo.save.mockImplementation(async (entity: any) => ({
        ...entity,
        id: 'usr-456',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const res = await service.crear({
        email: 'func@arca.test',
        rol: RolUsuario.FUNCIONARIO,
        funcionarioId: '11111111-1111-1111-1111-111111111111',
      });

      expect(res.usuario.funcionarioId).toBe('11111111-1111-1111-1111-111111111111');
      expect(res.usuario.rol).toBe(RolUsuario.FUNCIONARIO);
    });
  });

  describe('CA-07: Un ADMIN no puede desactivarse a sí mismo', () => {
    it('falla cuando el admin que realiza la petición intenta desactivar su propia cuenta', async () => {
      const adminId = 'admin-actual-uuid';

      await expect(service.cambiarEstado(adminId, { activo: false }, adminId)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });

    it('permite a un admin desactivar a otro usuario', async () => {
      const adminId = 'admin-actual-uuid';
      const targetUserId = 'otro-usuario-uuid';

      mockRepo.findById.mockResolvedValue({
        id: targetUserId,
        email: 'otro@arca.test',
        rol: RolUsuario.RRHH,
        activo: true,
      } as Usuario);

      mockRepo.save.mockImplementation(async (u: any) => u);

      const res = await service.cambiarEstado(targetUserId, { activo: false }, adminId);
      expect(res.activo).toBe(false);
    });
  });

  describe('CA-06: Endpoint interno de cambio de estado', () => {
    it('desactiva la cuenta cuando se pasa el id de usuario o el id de funcionario', async () => {
      const usuario = {
        id: 'usr-789',
        funcionarioId: 'func-789',
        activo: true,
      } as Usuario;

      mockRepo.findById.mockResolvedValue(null);
      mockRepo.findByFuncionarioId.mockResolvedValue(usuario);
      mockRepo.save.mockImplementation(async (u: any) => u);

      const res = await service.cambiarEstadoInterno('func-789', { estado: 'INACTIVO' });
      expect(res.id).toBe('usr-789');
      expect(res.estado).toBe('INACTIVO');
      expect(usuario.activo).toBe(false);
    });
  });
});
