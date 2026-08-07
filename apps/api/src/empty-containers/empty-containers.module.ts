import { Module } from "@nestjs/common";
import { EmptyContainersController } from "./empty-containers.controller";
import { EmptyContainersService } from "./empty-containers.service";

@Module({
  controllers: [EmptyContainersController],
  providers: [EmptyContainersService]
})
export class EmptyContainersModule {}
