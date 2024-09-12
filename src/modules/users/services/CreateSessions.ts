import { Inject, Service } from "typedi";
import IUsersRepository from "../repositories/IUsersRepository";
import IHashProvider from "../../../providers/HashProvider/models/IHashProvider";
import User from "../database/typeorm/entities/User";
import ApiError from "../../../infra/errors/ApiError";
import { sign } from 'jsonwebtoken';
import jwtConfig from "../../../configs/jwtConfig";

interface IRequest {
  email: string;
  password: string;
}

interface IResponse {
  token: string;
  user: User;
}

@Service()
export default class CreateSessions {
  constructor(
    @Inject('typeorm.usersRepository')
    private usersRepository: IUsersRepository,

    @Inject('hashProviders.bcrypt')
    private hashProvider: IHashProvider,
  ) {}

  private async checkPasswordMatch(
    givenPassword: string,
    userPassword: string
  ): Promise<boolean> {
    const passwordCheck = await this.hashProvider.check(
      userPassword,
      givenPassword,
    );

    return passwordCheck;
  }

  private async generateSessionToken(userId: string): Promise<string> {
    const tokenPayload = { userId };

    const token = sign(tokenPayload, jwtConfig.secret, {
      expiresIn: jwtConfig.exp,
    });

    return token;
  }

  private async updateUserLastActive(user: User): Promise<void> {
    await this.usersRepository.update(user, { lastActive: Date.now() });
  }

  public async execute(data: IRequest): Promise<IResponse> {
    const user = await this.usersRepository.findByEmail(data.email);

    if (!user) throw new ApiError('Email ou senha incorreto(s)');

    const passwordMatch = await this.checkPasswordMatch(
      data.password,
      user.password,
    );

    if (!passwordMatch) throw new ApiError('Email ou senha incorreto(s)');

    const token = await this.generateSessionToken(user.id);

    this.updateUserLastActive(user);

    return { token, user };
  }
}
