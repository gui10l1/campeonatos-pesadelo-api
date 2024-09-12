import { Inject, Service } from "typedi";

import { IUsersDTO } from "../dtos";
import IUsersRepository from "../repositories/IUsersRepository";
import IHashProvider from "../../../providers/HashProvider/models/IHashProvider";
import ApiError from "../../../infra/errors/ApiError";
import User from "../database/typeorm/entities/User";

type IRequest = IUsersDTO;

@Service()
export default class CreateUsers {
  constructor(
    @Inject("typeorm.usersRepository")
    private usersRepository: IUsersRepository,

    @Inject("hashProviders.bcrypt")
    private hashProvider: IHashProvider
  ) {}

  private async checkEmailAvailability(email: string): Promise<boolean> {
    const emailAlreadyInUse = await this.usersRepository.findByEmail(
      email
    );

    return !emailAlreadyInUse;
  }

  private async checkRegistrationAvailability(registration?: string): Promise<boolean> {
    if (!registration) return true;

    const registrationAlreadyInUse = await this.usersRepository
      .findByRegistration(registration);

    return !registrationAlreadyInUse;
  }

  public async execute(data: IRequest): Promise<User> {
    const emailAvailableToUse = await this.checkEmailAvailability(data.email);

    if (!emailAvailableToUse) throw new ApiError("Este email está em uso!");

    const registrationAvailableToUse = await this.checkRegistrationAvailability(
      data.registration,
    );

    if (!registrationAvailableToUse) {
      throw new ApiError('Esta matrícula já está em uso!');
    }

    const hashedPassword = await this.hashProvider.hash(data.password);
    const user = await this.usersRepository.create({
      ...data,
      password: hashedPassword,
    });

    return user;
  }
}
