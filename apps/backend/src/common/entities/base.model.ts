import { Exclude, Expose, Transform } from "class-transformer";
import { DateTime } from "luxon";
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { DateTimeTransformer, dateTimeToIso } from "../utils/datetime.util";

export abstract class BaseModel {
  @PrimaryGeneratedColumn("uuid")
  @Expose()
  id: string;

  @CreateDateColumn({ type: "timestamptz", transformer: DateTimeTransformer })
  @Transform(dateTimeToIso, { toPlainOnly: true })
  @Expose()
  createdAt: DateTime;

  @UpdateDateColumn({ type: "timestamptz", transformer: DateTimeTransformer })
  @Transform(dateTimeToIso, { toPlainOnly: true })
  @Expose()
  updatedAt: DateTime;

  @DeleteDateColumn({ type: "timestamptz", transformer: DateTimeTransformer })
  @Transform(dateTimeToIso, { toPlainOnly: true })
  @Exclude({ toPlainOnly: true })
  deletedAt: DateTime | null;
}
