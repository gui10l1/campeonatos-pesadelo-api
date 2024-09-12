import { Inject, Service } from "typedi";
import IUsersRepository from "../repositories/IUsersRepository";
import User from "../database/typeorm/entities/User";
import { IUsersDTO } from "../dtos";
import ApiError from "../../../infra/errors/ApiError";
import IHashProvider from "../../../providers/HashProvider/models/IHashProvider";

interface IUpdateData extends Partial<IUsersDTO> {
  oldPassword?: string;
}

interface IRequest {
  data: IUpdateData;
  userId: string;
};

@Service()
export default class EditUsers {
  constructor(
    @Inject('typeorm.usersRepository')
    private usersRepository: IUsersRepository,

    @Inject('hashProviders.bcrypt')
    private hashProvider: IHashProvider,
  ) {}

  private async getUserToUpdate(userId: string): Promise<User | undefined> {
    return this.usersRepository.findById(userId);
  }

  private async checkOldPassword(
    currentPassword: string,
    oldPassword: string
  ): Promise<boolean> {
    return this.hashProvider.check(currentPassword, oldPassword);
  }

  private async hashNewPassword(password: string): Promise<string> {
    return this.hashProvider.hash(password.trim());
  }

  private async checkEmailAvailability(email: string): Promise<boolean> {
    const emailInUse = await this.usersRepository.findByEmail(email.trim());

    return !emailInUse;
  }

  private async checkRegistrationAvailability(
    registration: string
  ): Promise<boolean> {
    const registrationInUse = await this.usersRepository.findByRegistration(
      registration.trim()
    );

    return !registrationInUse;
  }

  public async execute({ data, userId }: IRequest): Promise<User> {
    const user = await this.getUserToUpdate(userId);

    if (!user) {
      throw new ApiError('Não foi possível encontrar o usuário para editar!');
    }

    const dataToUpdate = { ...data };

    if (data.password && data.oldPassword) {
      const passwordMatches = await this.checkOldPassword(
        user.password,
        data.oldPassword,
      );

      if (!passwordMatches) {
        throw new ApiError('A senha atual está incorreta!');
      }

      const updatedPass = await this.hashNewPassword(data.password);

      dataToUpdate.password = updatedPass;
    }

    if (data.email && data.email.trim() !== user.email.trim()) {
      const emailIsAvailable = await this.checkEmailAvailability(data.email);

      if (!emailIsAvailable) {
        throw new ApiError('Este email está em uso por outra conta!');
      }
    }

    if (data.registration && data.registration.trim() !== user.registration?.trim()) {
      const registrationIsAvailable = await this.checkRegistrationAvailability(
        data.registration
      );

      if (!registrationIsAvailable) {
        throw new ApiError('A matrícula fornecida está em uso por outra conta!');
      }
    }

    const updatedUser = await this.usersRepository.update(
      user,
      dataToUpdate,
    );

    return updatedUser;
  }
}
