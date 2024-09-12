import { Inject, Service } from "typedi";
import ITeamsRepository from "../repositories/ITeamsRepository";
import IUsersRepository from "../../users/repositories/IUsersRepository";
import Team, { Modality } from "../database/typeorm/entities/Team";
import { ITeamsDTO } from "../dtos";
import ApiError from "../../../infra/errors/ApiError";
import { IDiskProvider } from "../../../providers/DiskProvider/models/IDiskProvider";

@Service()
export default class CreateTeams {
  constructor(
    @Inject("typeorm.teamsRepository")
    private teamsRepository: ITeamsRepository,

    @Inject("typeorm.usersRepository")
    private usersRepository: IUsersRepository,

    @Inject("diskProviders.disk")
    private diskProvider: IDiskProvider
  ) {}

  private isModalityInvalid(modality: number): boolean {
    const invalidModality = Object.entries(Modality).every(
      ([, mod]) => mod !== modality
    );

    return invalidModality;
  }

  private async savePhotoToDisk(photo?: string): Promise<void> {
    if (photo) {
      await this.diskProvider.saveFiles([photo]);
    }
  }

  public async execute(data: ITeamsDTO): Promise<Team> {
    const { leaderId } = data;

    const leader = await this.usersRepository.findById(leaderId);

    if (!leader) {
      throw new ApiError(
        "Não foi possível localizar o líder do time na base de dados!"
      );
    }

    const invalidModality = this.isModalityInvalid(data.modality);

    if (invalidModality) {
      throw new ApiError("A modalidade escolhida é inválida!");
    }

    this.savePhotoToDisk(data.photo);

    const team = await this.teamsRepository.create(data);

    return team;
  }
}
