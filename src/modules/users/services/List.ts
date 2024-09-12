import { Inject, Service } from "typedi";

import IUsersRepository from "../repositories/IUsersRepository";
import User, { UserAccess } from "../database/typeorm/entities/User";
import ApiError from "../../../infra/errors/ApiError";

interface IRequest {
  userId: string;
}

@Service()
export default class ListUsers {
  constructor(
    @Inject("typeorm.usersRepository")
    private usersRepository: IUsersRepository,
  ) {}

  private async getAdminUser(userId: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(userId);
  }

  private checkUserAccess(userAccess: UserAccess): boolean {
    const userHasAccess = userAccess === UserAccess.ADMIN;

    return userHasAccess;
  }

  private removeAdminFromUserList(users: User[], adminId: string): User[] {
    return users.filter(item => item.id !== adminId);
  }

  public async execute({ userId }: IRequest): Promise<User[]> {
    const user = await this.getAdminUser(userId);

    if (!user) throw new ApiError('Não autorizado!', 401);

    const userHasAccess = this.checkUserAccess(user.access);

    if (!userHasAccess) {
      throw new ApiError('Você não pode acessar este recurso!', 401);
    }

    const users = await this.usersRepository.list();

    return this.removeAdminFromUserList(users, user.id);
  }
}
