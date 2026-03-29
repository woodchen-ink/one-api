package model

import (
	"czloapi/common/config"
	"czloapi/common/logger"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"

	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const legacyQuotaPerUnitDefault = 500 * 1000.0

type postgresPrimaryConstraint struct {
	ConstraintName string `gorm:"column:constraint_name"`
	Columns        string `gorm:"column:columns"`
}

type postgresIndexMetadata struct {
	IndexName         string `gorm:"column:index_name"`
	IsUnique          bool   `gorm:"column:is_unique"`
	IsPrimary         bool   `gorm:"column:is_primary"`
	IsConstraintIndex bool   `gorm:"column:is_constraint_index"`
	Columns           string `gorm:"column:columns"`
}

type postgresColumnMetadata struct {
	ColumnDefault string `gorm:"column:column_default"`
	IsIdentity    string `gorm:"column:is_identity"`
	DataType      string `gorm:"column:data_type"`
}

func isIgnorableSequenceOwnershipError(err error) bool {
	if err == nil {
		return false
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "sqlstate 55000") ||
		strings.Contains(message, "must have same owner as table")
}

func autoMigrateModels(includeInvoiceMonth bool) []interface{} {
	models := []interface{}{
		&Channel{},
		&Key{},
		&User{},
		&Option{},
		&Redemption{},
		&Log{},
		&TelegramMenu{},
		&Price{},
		&Payment{},
		&Order{},
		&Task{},
		&Statistics{},
		&UserGroup{},
		&ModelOwnedBy{},
		&WebAuthnCredential{},
		&ModelMapping{},
		&Tutorial{},
		&Notice{},
		&SubscriptionPlan{},
		&UserSubscription{},
	}

	if includeInvoiceMonth {
		models = append(models, &StatisticsMonthGeneratedHistory{}, &StatisticsMonth{})
	}

	return models
}

func quoteIdentifier(identifier string) string {
	return `"` + strings.ReplaceAll(identifier, `"`, `""`) + `"`
}

func normalizeColumns(columns []string) []string {
	result := make([]string, 0, len(columns))
	for _, column := range columns {
		column = strings.TrimSpace(strings.ToLower(column))
		if column != "" {
			result = append(result, column)
		}
	}
	sort.Strings(result)
	return result
}

func sameColumns(a, b []string) bool {
	left := normalizeColumns(a)
	right := normalizeColumns(b)
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if left[i] != right[i] {
			return false
		}
	}
	return true
}

func getExpectedPrimaryColumns(tx *gorm.DB, model interface{}) (string, []string, error) {
	stmt := &gorm.Statement{DB: tx}
	if err := stmt.Parse(model); err != nil {
		return "", nil, err
	}

	columns := make([]string, 0, len(stmt.Schema.PrimaryFields))
	for _, field := range stmt.Schema.PrimaryFields {
		columns = append(columns, field.DBName)
	}
	return stmt.Schema.Table, columns, nil
}

func getPostgresPrimaryConstraint(tx *gorm.DB, tableName string) (*postgresPrimaryConstraint, error) {
	var constraint postgresPrimaryConstraint
	err := tx.Raw(`
SELECT
    c.conname AS constraint_name,
    string_agg(a.attname, ',' ORDER BY cols.ord) AS columns
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ord) ON TRUE
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
WHERE c.contype = 'p'
  AND t.relname = ?
GROUP BY c.conname
LIMIT 1
`, tableName).Scan(&constraint).Error
	if err != nil {
		return nil, err
	}
	if constraint.ConstraintName == "" {
		return nil, nil
	}
	return &constraint, nil
}

func tableHasForeignKeyReferences(tx *gorm.DB, tableName string) (bool, error) {
	var count int64
	err := tx.Raw(`
SELECT COUNT(1)
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.confrelid
WHERE c.contype = 'f'
  AND t.relname = ?
`, tableName).Scan(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func repairPostgresPrimaryConstraints(tx *gorm.DB, includeInvoiceMonth bool) error {
	models := autoMigrateModels(includeInvoiceMonth)
	for _, model := range models {
		tableName, expectedPrimaryColumns, err := getExpectedPrimaryColumns(tx, model)
		if err != nil {
			return err
		}
		if !tx.Migrator().HasTable(tableName) {
			continue
		}

		constraint, err := getPostgresPrimaryConstraint(tx, tableName)
		if err != nil {
			return err
		}
		if constraint == nil {
			continue
		}

		actualPrimaryColumns := strings.Split(constraint.Columns, ",")
		if sameColumns(actualPrimaryColumns, expectedPrimaryColumns) {
			continue
		}

		// 模型已不再定义主键（典型场景：legacy prices.model 主键），可自动删除历史主键。
		if len(expectedPrimaryColumns) == 0 {
			hasReferences, err := tableHasForeignKeyReferences(tx, tableName)
			if err != nil {
				return err
			}
			if hasReferences {
				logger.SysError(fmt.Sprintf("skip dropping primary key on %s due to foreign key references", tableName))
				continue
			}
			err = tx.Exec("ALTER TABLE " + quoteIdentifier(tableName) + " DROP CONSTRAINT " + quoteIdentifier(constraint.ConstraintName)).Error
			if err != nil {
				return err
			}
			logger.SysLog(fmt.Sprintf("dropped legacy primary key constraint %s on %s", constraint.ConstraintName, tableName))
			continue
		}

		logger.SysError(fmt.Sprintf(
			"detected mismatched primary key on %s (actual: %s, expected: %s), keep unchanged for safety",
			tableName,
			strings.Join(actualPrimaryColumns, ","),
			strings.Join(expectedPrimaryColumns, ","),
		))
	}
	return nil
}

func listPostgresTableIndexes(tx *gorm.DB, tableName string) ([]postgresIndexMetadata, error) {
	var indexes []postgresIndexMetadata
	err := tx.Raw(`
SELECT
    idx.relname AS index_name,
    i.indisunique AS is_unique,
    i.indisprimary AS is_primary,
    EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid) AS is_constraint_index,
    COALESCE(string_agg(att.attname, ',' ORDER BY cols.ord), '') AS columns
FROM pg_class tbl
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
JOIN pg_index i ON tbl.oid = i.indrelid
JOIN pg_class idx ON idx.oid = i.indexrelid
LEFT JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS cols(attnum, ord) ON TRUE
LEFT JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = cols.attnum
WHERE ns.nspname = current_schema()
  AND tbl.relname = ?
GROUP BY idx.relname, i.indisunique, i.indisprimary, i.indexrelid
`, tableName).Scan(&indexes).Error
	return indexes, err
}

func pickIndexToKeep(indexes []postgresIndexMetadata) postgresIndexMetadata {
	if len(indexes) == 0 {
		return postgresIndexMetadata{}
	}

	sorted := make([]postgresIndexMetadata, len(indexes))
	copy(sorted, indexes)
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].IsConstraintIndex != sorted[j].IsConstraintIndex {
			return sorted[i].IsConstraintIndex
		}
		leftIdxPrefix := strings.HasPrefix(sorted[i].IndexName, "idx_")
		rightIdxPrefix := strings.HasPrefix(sorted[j].IndexName, "idx_")
		if leftIdxPrefix != rightIdxPrefix {
			return leftIdxPrefix
		}
		return sorted[i].IndexName < sorted[j].IndexName
	})
	return sorted[0]
}

func repairPostgresDuplicateIndexes(tx *gorm.DB, includeInvoiceMonth bool) error {
	models := autoMigrateModels(includeInvoiceMonth)
	for _, model := range models {
		stmt := &gorm.Statement{DB: tx}
		if err := stmt.Parse(model); err != nil {
			return err
		}
		tableName := stmt.Schema.Table
		if !tx.Migrator().HasTable(tableName) {
			continue
		}

		indexes, err := listPostgresTableIndexes(tx, tableName)
		if err != nil {
			return err
		}

		grouped := make(map[string][]postgresIndexMetadata)
		for _, index := range indexes {
			if index.IsPrimary {
				continue
			}
			columns := strings.TrimSpace(index.Columns)
			if columns == "" {
				// 表达式索引或无法解析列信息，不做自动处理。
				continue
			}
			signature := strconv.FormatBool(index.IsUnique) + "|" + strings.ToLower(columns)
			grouped[signature] = append(grouped[signature], index)
		}

		for signature, candidates := range grouped {
			if len(candidates) <= 1 {
				continue
			}

			keep := pickIndexToKeep(candidates)
			for _, index := range candidates {
				if index.IndexName == keep.IndexName {
					continue
				}
				err = tx.Exec("DROP INDEX IF EXISTS " + quoteIdentifier(index.IndexName)).Error
				if err != nil {
					return err
				}
				logger.SysLog(fmt.Sprintf("dropped duplicate index %s on %s (signature: %s, kept: %s)", index.IndexName, tableName, signature, keep.IndexName))
			}
		}
	}
	return nil
}

func repairPostgresIDAutoIncrement(tx *gorm.DB, includeInvoiceMonth bool) error {
	models := autoMigrateModels(includeInvoiceMonth)
	for _, model := range models {
		tableName, expectedPrimaryColumns, err := getExpectedPrimaryColumns(tx, model)
		if err != nil {
			return err
		}
		if !tx.Migrator().HasTable(tableName) {
			continue
		}

		// 仅修复约定的单列 id 主键表。
		if len(expectedPrimaryColumns) != 1 || strings.ToLower(expectedPrimaryColumns[0]) != "id" {
			continue
		}

		var column postgresColumnMetadata
		err = tx.Raw(`
SELECT
    COALESCE(column_default, '') AS column_default,
    COALESCE(is_identity, 'NO') AS is_identity,
    COALESCE(data_type, '') AS data_type
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = ?
  AND column_name = 'id'
LIMIT 1
`, tableName).Scan(&column).Error
		if err != nil {
			return err
		}
		if column.DataType == "" {
			continue
		}

		normalizedType := strings.ToLower(strings.TrimSpace(column.DataType))
		if normalizedType != "integer" && normalizedType != "bigint" && normalizedType != "smallint" {
			continue
		}

		if strings.EqualFold(strings.TrimSpace(column.IsIdentity), "YES") || strings.Contains(strings.ToLower(column.ColumnDefault), "nextval(") {
			continue
		}

		sequenceName := tableName + "_id_seq"
		quotedTable := quoteIdentifier(tableName)
		quotedSequence := quoteIdentifier(sequenceName)

		if err = tx.Exec("CREATE SEQUENCE IF NOT EXISTS " + quotedSequence).Error; err != nil {
			return err
		}
		if err = tx.Exec("ALTER SEQUENCE " + quotedSequence + " OWNED BY " + quotedTable + ".\"id\"").Error; err != nil {
			if isIgnorableSequenceOwnershipError(err) {
				logger.SysError(fmt.Sprintf("skip sequence ownership binding for %s.%s: %s", tableName, sequenceName, err.Error()))
			} else {
				return err
			}
		}
		if err = tx.Exec(`
SELECT setval(
    '` + sequenceName + `',
    COALESCE((SELECT MAX("id") FROM ` + quotedTable + `), 1),
    (SELECT MAX("id") IS NOT NULL FROM ` + quotedTable + `)
)`).Error; err != nil {
			return err
		}
		if err = tx.Exec("ALTER TABLE " + quotedTable + " ALTER COLUMN \"id\" SET DEFAULT nextval('" + sequenceName + "')").Error; err != nil {
			return err
		}

		logger.SysLog(fmt.Sprintf("repaired id auto increment on %s (sequence: %s)", tableName, sequenceName))
	}
	return nil
}

func repairPostgresSchemaCompatibility() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603230003",
		Migrate: func(tx *gorm.DB) error {
			if tx.Dialector.Name() != "postgres" {
				return nil
			}
			includeInvoiceMonth := config.UserInvoiceMonth
			if err := repairPostgresPrimaryConstraints(tx, includeInvoiceMonth); err != nil {
				return err
			}
			if err := repairPostgresIDAutoIncrement(tx, includeInvoiceMonth); err != nil {
				return err
			}
			if err := repairPostgresDuplicateIndexes(tx, includeInvoiceMonth); err != nil {
				return err
			}
			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func repairPostgresIDAutoIncrementMigration() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603230004",
		Migrate: func(tx *gorm.DB) error {
			if tx.Dialector.Name() != "postgres" {
				return nil
			}
			return repairPostgresIDAutoIncrement(tx, config.UserInvoiceMonth)
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func getOptionKeyColumnName(tx *gorm.DB) string {
	if tx != nil && tx.Dialector.Name() == "postgres" {
		return `"key"`
	}
	return "`key`"
}

func removeKeyIndexMigration() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202405152141",
		Migrate: func(tx *gorm.DB) error {
			dialect := tx.Dialector.Name()
			if dialect == "sqlite" {
				return nil
			}

			if !tx.Migrator().HasIndex(&Channel{}, "idx_channels_key") {
				return nil
			}

			err := tx.Migrator().DropIndex(&Channel{}, "idx_channels_key")
			if err != nil {
				logger.SysLog("remove idx_channels_key  Failure: " + err.Error())
			}
			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func changeTokenKeyColumnType() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202411300001",
		Migrate: func(tx *gorm.DB) error {
			tableName := "keys"
			if !tx.Migrator().HasTable(tableName) {
				tableName = "tokens"
			}
			if !tx.Migrator().HasTable(tableName) {
				return nil
			}

			dialect := tx.Dialector.Name()
			var err error

			switch dialect {
			case "mysql":
				err = tx.Exec("ALTER TABLE " + tableName + " MODIFY COLUMN `key` varchar(59)").Error
			case "postgres":
				err = tx.Exec("ALTER TABLE " + tableName + " ALTER COLUMN key TYPE varchar(59)").Error
			case "sqlite":
				return nil
			}

			if err != nil {
				logger.SysLog("修改 " + tableName + ".key 字段类型失败: " + err.Error())
				return err
			}
			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			tableName := "keys"
			if !tx.Migrator().HasTable(tableName) {
				tableName = "tokens"
			}
			if !tx.Migrator().HasTable(tableName) {
				return nil
			}

			dialect := tx.Dialector.Name()
			var err error

			switch dialect {
			case "mysql":
				err = tx.Exec("ALTER TABLE " + tableName + " MODIFY COLUMN `key` char(48)").Error
			case "postgres":
				err = tx.Exec("ALTER TABLE " + tableName + " ALTER COLUMN key TYPE char(48)").Error
			}
			return err
		},
	}
}

func renameTokensToKeysSchema() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603240003",
		Migrate: func(tx *gorm.DB) error {
			if tx.Migrator().HasTable("tokens") && !tx.Migrator().HasTable("keys") {
				if err := tx.Migrator().RenameTable("tokens", "keys"); err != nil {
					return err
				}
			}

			if tx.Migrator().HasTable("users") && tx.Migrator().HasColumn("users", "access_token") && !tx.Migrator().HasColumn("users", "access_key") {
				if err := tx.Migrator().RenameColumn("users", "access_token", "access_key"); err != nil {
					return err
				}
			}

			if tx.Migrator().HasTable("logs") {
				if tx.Migrator().HasColumn("logs", "token_id") && !tx.Migrator().HasColumn("logs", "key_id") {
					if err := tx.Migrator().RenameColumn("logs", "token_id", "key_id"); err != nil {
						return err
					}
				}
				if tx.Migrator().HasColumn("logs", "token_name") && !tx.Migrator().HasColumn("logs", "key_name") {
					if err := tx.Migrator().RenameColumn("logs", "token_name", "key_name"); err != nil {
						return err
					}
				}
			}

			if tx.Migrator().HasTable("tasks") && tx.Migrator().HasColumn("tasks", "token_id") && !tx.Migrator().HasColumn("tasks", "key_id") {
				if err := tx.Migrator().RenameColumn("tasks", "token_id", "key_id"); err != nil {
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			if tx.Migrator().HasTable("keys") && !tx.Migrator().HasTable("tokens") {
				if err := tx.Migrator().RenameTable("keys", "tokens"); err != nil {
					return err
				}
			}
			return nil
		},
	}
}

func cleanupLegacyKeyIndexes() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603240004",
		Migrate: func(tx *gorm.DB) error {
			dropIndexIfExists := func(value interface{}, indexName string) error {
				if !tx.Migrator().HasIndex(value, indexName) {
					return nil
				}
				return tx.Migrator().DropIndex(value, indexName)
			}

			if tx.Migrator().HasTable("keys") {
				if err := dropIndexIfExists("keys", "idx_tokens_key"); err != nil {
					return err
				}
			}

			if tx.Migrator().HasTable("users") {
				if err := dropIndexIfExists("users", "idx_users_access_token"); err != nil {
					return err
				}
			}

			if tx.Migrator().HasTable("logs") {
				if err := dropIndexIfExists("logs", "idx_logs_token_id"); err != nil {
					return err
				}
				if err := dropIndexIfExists("logs", "idx_logs_token_name"); err != nil {
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func dropLegacyPricesPrimaryKeyOnPostgres() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603230002",
		Migrate: func(tx *gorm.DB) error {
			if tx.Dialector.Name() != "postgres" {
				return nil
			}
			if !tx.Migrator().HasTable("prices") {
				return nil
			}

			// 旧版本可能把 prices.model 作为主键，当前模型已取消主键定义。
			// 先移除该历史主键，避免 AutoMigrate 在调整列属性时触发 PostgreSQL 错误。
			const sql = `
DO $$
DECLARE
    pk_name TEXT;
    pk_has_model BOOLEAN;
BEGIN
    SELECT c.conname,
           EXISTS (
               SELECT 1
               FROM unnest(c.conkey) AS k(attnum)
               JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
               WHERE a.attname = 'model'
           )
    INTO pk_name, pk_has_model
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE c.contype = 'p' AND t.relname = 'prices'
    LIMIT 1;

    IF pk_name IS NOT NULL AND pk_has_model THEN
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'prices', pk_name);
    END IF;
END $$;
`
			return tx.Exec(sql).Error
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func dropLegacyLogsChannelForeignKeyOnPostgres() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603230005",
		Migrate: func(tx *gorm.DB) error {
			if tx.Dialector.Name() != "postgres" {
				return nil
			}
			if tx.Migrator().HasTable("channels") {
				// 历史错误关系可能在 channels 表上生成了反向外键 fk_logs_channel。
				// 正确关系应为 logs.channel_id -> channels.id。
				if err := tx.Exec(`ALTER TABLE "channels" DROP CONSTRAINT IF EXISTS "fk_logs_channel"`).Error; err != nil {
					return err
				}
			}

			// 清理 logs 表上的同名外键，避免历史脏数据导致 AutoMigrate 再次失败。
			if tx.Migrator().HasTable("logs") {
				if err := tx.Exec(`ALTER TABLE "logs" DROP CONSTRAINT IF EXISTS "fk_logs_channel"`).Error; err != nil {
					return err
				}
			}
			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func migrationBefore(db *gorm.DB) error {
	// 从库不执行
	if !config.IsMasterNode {
		logger.SysLog("从库不执行迁移前操作")
		return nil
	}

	// 如果是第一次运行 直接跳过
	if !db.Migrator().HasTable("channels") {
		return nil
	}

	m := gormigrate.New(db, gormigrate.DefaultOptions, []*gormigrate.Migration{
		removeKeyIndexMigration(),
		renameTokensToKeysSchema(),
		cleanupLegacyKeyIndexes(),
		changeTokenKeyColumnType(),
		dropLegacyPricesPrimaryKeyOnPostgres(),
		repairPostgresSchemaCompatibility(),
		repairPostgresIDAutoIncrementMigration(),
		dropLegacyLogsChannelForeignKeyOnPostgres(),
	})
	return m.Migrate()
}

func addStatistics() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202408100001",
		Migrate: func(tx *gorm.DB) error {
			go UpdateStatistics(StatisticsUpdateTypeALL)
			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func changeChannelApiVersion() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202408190001",
		Migrate: func(tx *gorm.DB) error {
			plugin := `{"customize": {"1": "{version}/chat/completions", "2": "{version}/completions", "3": "{version}/embeddings", "4": "{version}/moderations", "5": "{version}/images/generations", "6": "{version}/images/edits", "7": "{version}/images/variations", "9": "{version}/audio/speech", "10": "{version}/audio/transcriptions", "11": "{version}/audio/translations"}}`

			// 查询 channel 表中的type 为 8，且 other = disable 的数据,直接更新
			var jsonMap map[string]map[string]interface{}
			err := json.Unmarshal([]byte(strings.Replace(plugin, "{version}", "", -1)), &jsonMap)
			if err != nil {
				logger.SysLog("changeChannelApiVersion Failure: " + err.Error())
				return err
			}
			disableApi := map[string]interface{}{
				"other":  "",
				"plugin": datatypes.NewJSONType(jsonMap),
			}

			err = tx.Model(&Channel{}).Where("type = ? AND other = ?", 8, "disable").Updates(disableApi).Error
			if err != nil {
				logger.SysLog("changeChannelApiVersion Failure: " + err.Error())
				return err
			}

			// 查询 channel 表中的type 为 8，且 other != disable 并且不为空 的数据,直接更新
			var channels []*Channel
			err = tx.Model(&Channel{}).Where("type = ? AND other != ? AND other != ?", 8, "disable", "").Find(&channels).Error
			if err != nil {
				logger.SysLog("changeChannelApiVersion Failure: " + err.Error())
				return err
			}

			for _, channel := range channels {
				var jsonMap map[string]map[string]interface{}
				err := json.Unmarshal([]byte(strings.Replace(plugin, "{version}", "/"+channel.Other, -1)), &jsonMap)
				if err != nil {
					logger.SysLog("changeChannelApiVersion Failure: " + err.Error())
					return err
				}
				changeApi := map[string]interface{}{
					"other":  "",
					"plugin": datatypes.NewJSONType(jsonMap),
				}
				err = tx.Model(&Channel{}).Where("id = ?", channel.Id).Updates(changeApi).Error
				if err != nil {
					logger.SysLog("changeChannelApiVersion Failure: " + err.Error())
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return tx.Rollback().Error
		},
	}
}

func initUserGroup() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202410300001",
		Migrate: func(tx *gorm.DB) error {
			userGroups := map[string]*UserGroup{
				"default": {
					Symbol: "default",
					Name:   "默认分组",
					Ratio:  1,
					Public: true,
				},
				"vip": {
					Symbol: "vip",
					Name:   "vip分组",
					Ratio:  1,
					Public: false,
				},
				"svip": {
					Symbol: "svip",
					Name:   "svip分组",
					Ratio:  1,
					Public: false,
				},
			}
			option, err := GetOption("GroupRatio")
			if err == nil && option.Value != "" {
				oldGroup := make(map[string]float64)
				err = json.Unmarshal([]byte(option.Value), &oldGroup)
				if err != nil {
					return err
				}

				for k, v := range oldGroup {
					isPublic := false
					if k == "default" {
						isPublic = true
					}
					userGroups[k] = &UserGroup{
						Symbol: k,
						Name:   k,
						Ratio:  v,
						Public: isPublic,
					}
				}
			}

			for k, v := range userGroups {
				err := tx.Where("symbol = ?", k).FirstOrCreate(v).Error
				if err != nil {
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return tx.Rollback().Error
		},
	}
}

func addOldTokenMaxId() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202411300002",
		Migrate: func(tx *gorm.DB) error {
			var token Token
			tx.Last(&token)
			tokenMaxId := token.Id
			option := Option{
				Key: "OldTokenMaxId",
			}

			DB.FirstOrCreate(&option, Option{Key: "OldTokenMaxId"})
			option.Value = strconv.Itoa(tokenMaxId)
			return DB.Save(&option).Error
		},
		Rollback: func(tx *gorm.DB) error {
			return tx.Rollback().Error
		},
	}
}

func addUserGroupDefaultFlag() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603180001",
		Migrate: func(tx *gorm.DB) error {
			if !tx.Migrator().HasColumn(&UserGroup{}, "is_default") {
				return nil
			}

			var count int64
			if err := tx.Model(&UserGroup{}).Where("is_default = ?", true).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				return nil
			}

			return tx.Model(&UserGroup{}).Where("symbol = ?", DefaultUserGroupSymbol).Update("is_default", true).Error
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func addExtraRatios() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202504300001",
		Migrate: func(tx *gorm.DB) error {
			extraTokenPriceJson := ""
			extraRatios := make(map[string]map[string]float64)

			// Only migrate explicitly configured extra ratios.
			option, err := GetOption("ExtraTokenPriceJson")
			if err == nil && option.Value != "" {
				extraTokenPriceJson = option.Value
			} else {
				return nil
			}

			err = json.Unmarshal([]byte(extraTokenPriceJson), &extraRatios)
			if err != nil {
				return err
			}

			if len(extraRatios) == 0 {
				return nil
			}

			models := make([]string, 0)
			for model := range extraRatios {
				models = append(models, model)
			}

			// 查询数据库中是否存在
			var prices []*Price
			err = tx.Where("model IN (?)", models).Find(&prices).Error
			if err != nil {
				return err
			}

			for _, price := range prices {
				extraRatios := extraRatios[price.Model]
				jsonData := datatypes.NewJSONType(extraRatios)
				price.ExtraRatios = &jsonData
				err = tx.Model(&Price{}).Where("model = ?", price.Model).Updates(map[string]interface{}{
					"extra_ratios": jsonData,
				}).Error
				if err != nil {
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return tx.Rollback().Error
		},
	}
}

func migratePricingToUSD() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603190001",
		Migrate: func(tx *gorm.DB) error {
			if !tx.Migrator().HasTable("prices") {
				return nil
			}

			var prices []*Price
			if err := tx.Find(&prices).Error; err != nil {
				return err
			}

			for _, price := range prices {
				convertedInput := LegacyTimesPriceToUSD(price.Input)
				convertedOutput := LegacyTimesPriceToUSD(price.Output)
				if price.Type == TokensPriceType {
					convertedInput = LegacyTokenPriceToUSDPerMillion(price.Input)
					convertedOutput = LegacyTokenPriceToUSDPerMillion(price.Output)
				}

				updates := map[string]any{
					"input":  convertedInput,
					"output": convertedOutput,
				}

				if price.ExtraRatios != nil {
					extraPrices := make(map[string]float64, len(price.ExtraRatios.Data()))
					for key, value := range price.ExtraRatios.Data() {
						basePrice := convertedOutput
						if GetExtraPriceUsesInputPrice(key) {
							basePrice = convertedInput
						}
						extraPrices[key] = basePrice * value
					}
					jsonData := datatypes.NewJSONType(extraPrices)
					updates["extra_ratios"] = jsonData
				}

				if err := tx.Model(&Price{}).Where("model = ?", price.Model).Updates(updates).Error; err != nil {
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func migrateReliableUsersToCommon() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603190002",
		Migrate: func(tx *gorm.DB) error {
			if !tx.Migrator().HasTable("users") {
				return nil
			}

			const legacyReliableUserRole = 3

			return tx.Model(&User{}).
				Where("role = ?", legacyReliableUserRole).
				Update("role", config.RoleCommonUser).Error
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func migrateQuotaScaleToMicroUSD() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603230001",
		Migrate: func(tx *gorm.DB) error {
			legacyQuotaPerUnit, _, err := detectLegacyQuotaScale(tx)
			if err != nil {
				return err
			}
			return applyQuotaScaleMigration(tx, legacyQuotaPerUnit)
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func detectLegacyQuotaScale(tx *gorm.DB) (float64, bool, error) {
	if !tx.Migrator().HasTable("users") {
		return 0, false, nil
	}

	if tx.Migrator().HasTable("options") {
		var option Option
		err := tx.Where(getOptionKeyColumnName(tx)+" = ?", "QuotaPerUnit").First(&option).Error
		if err == nil {
			parsed, parseErr := strconv.ParseFloat(strings.TrimSpace(option.Value), 64)
			if parseErr == nil && parsed > 0 && math.Abs(parsed-config.MoneyScaleMicroUSD) > 1e-9 {
				return parsed, true, nil
			}
		}
	}

	if !tx.Migrator().HasTable("orders") {
		return 0, false, nil
	}

	var oldScaleCount int64
	var newScaleCount int64
	if err := tx.Model(&Order{}).
		Where("status = ? AND subscription_plan_id = 0 AND amount > 0 AND quota = amount * ?", OrderStatusSuccess, int(legacyQuotaPerUnitDefault)).
		Count(&oldScaleCount).Error; err != nil {
		return 0, false, err
	}
	if err := tx.Model(&Order{}).
		Where("status = ? AND subscription_plan_id = 0 AND amount > 0 AND quota = amount * ?", OrderStatusSuccess, int(config.MoneyScaleMicroUSD)).
		Count(&newScaleCount).Error; err != nil {
		return 0, false, err
	}

	if oldScaleCount > 0 && newScaleCount == 0 {
		return legacyQuotaPerUnitDefault, true, nil
	}

	if oldScaleCount > 0 && newScaleCount > 0 {
		logger.SysError(fmt.Sprintf(
			"detected mixed quota scales in orders, old=%d new=%d; automatic repair skipped",
			oldScaleCount,
			newScaleCount,
		))
	}

	return 0, false, nil
}

func applyQuotaScaleMigration(tx *gorm.DB, legacyQuotaPerUnit float64) error {
	if legacyQuotaPerUnit <= 0 {
		return nil
	}

	ratio := config.MoneyScaleMicroUSD / legacyQuotaPerUnit
	if math.Abs(ratio-1.0) < 1e-9 {
		if tx.Migrator().HasTable("options") {
			if err := tx.Where(getOptionKeyColumnName(tx)+" = ?", "QuotaPerUnit").Delete(&Option{}).Error; err != nil {
				return err
			}
		}
		return nil
	}

	logger.SysLog("migrating quota scale to micro-USD with ratio: " + strconv.FormatFloat(ratio, 'f', 8, 64))

	quotaColumnsByTable := []struct {
		Table   string
		Columns []string
	}{
		{Table: "users", Columns: []string{"quota", "used_quota", "aff_quota", "aff_history"}},
		{Table: "keys", Columns: []string{"remain_quota", "used_quota"}},
		{Table: "orders", Columns: []string{"quota"}},
		{Table: "logs", Columns: []string{"quota"}},
		{Table: "channels", Columns: []string{"used_quota"}},
		{Table: "redemptions", Columns: []string{"quota"}},
		{Table: "tasks", Columns: []string{"quota"}},
		{Table: "statistics", Columns: []string{"quota"}},
		{Table: "statistics_months", Columns: []string{"quota"}},
		{Table: "statistics_month_generated_histories", Columns: []string{"quota"}},
	}

	for _, item := range quotaColumnsByTable {
		if !tx.Migrator().HasTable(item.Table) {
			continue
		}

		columnTypes, err := tx.Migrator().ColumnTypes(item.Table)
		if err != nil {
			return err
		}
		existingColumns := make(map[string]struct{}, len(columnTypes))
		for _, columnType := range columnTypes {
			existingColumns[strings.ToLower(columnType.Name())] = struct{}{}
		}

		for _, column := range item.Columns {
			if _, ok := existingColumns[strings.ToLower(column)]; !ok {
				continue
			}

			if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).
				Table(item.Table).
				Update(column, gorm.Expr("ROUND("+column+" * ?)", ratio)).Error; err != nil {
				return err
			}
		}
	}

	if tx.Migrator().HasTable("options") {
		quotaOptionKeys := []string{
			"QuotaForNewUser",
			"QuotaForInviter",
			"QuotaForInvitee",
			"QuotaRemindThreshold",
			"PreConsumedQuota",
		}

		var options []Option
		if err := tx.Where(getOptionKeyColumnName(tx)+" IN ?", quotaOptionKeys).Find(&options).Error; err != nil {
			return err
		}

		for _, option := range options {
			value := strings.TrimSpace(option.Value)
			if value == "" {
				continue
			}
			parsed, err := strconv.ParseFloat(value, 64)
			if err != nil {
				continue
			}
			scaled := int(math.Round(parsed * ratio))
			if err := tx.Model(&Option{}).Where(getOptionKeyColumnName(tx)+" = ?", option.Key).Update("value", strconv.Itoa(scaled)).Error; err != nil {
				return err
			}
		}

		if err := tx.Where(getOptionKeyColumnName(tx)+" = ?", "QuotaPerUnit").Delete(&Option{}).Error; err != nil {
			return err
		}
	}

	return nil
}

func removeDeprecatedOAuthAuth() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603190003",
		Migrate: func(tx *gorm.DB) error {
			if tx.Migrator().HasTable("users") {
				if tx.Migrator().HasColumn(&User{}, "wechat_id") {
					if err := tx.Migrator().DropColumn(&User{}, "wechat_id"); err != nil {
						return err
					}
				}
				if tx.Migrator().HasColumn(&User{}, "lark_id") {
					if err := tx.Migrator().DropColumn(&User{}, "lark_id"); err != nil {
						return err
					}
				}
			}

			if tx.Migrator().HasTable("options") {
				optionKeys := []string{
					"WeChatAuthEnabled",
					"WeChatServerAddress",
					"WeChatServerToken",
					"WeChatAccountQRCodeImageURL",
					"LarkAuthEnabled",
					"LarkClientId",
					"LarkClientSecret",
				}
				if err := tx.Where(getOptionKeyColumnName(tx)+" IN ?", optionKeys).Delete(&Option{}).Error; err != nil {
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func migrateTokenLimitsStructure() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202510160002",
		Migrate: func(tx *gorm.DB) error {
			// 直接查询原始JSON字符串，避免GORM自动转换
			type KeyRaw struct {
				Id      int    `gorm:"column:id"`
				Name    string `gorm:"column:name"`
				Setting string `gorm:"column:setting;type:json"`
			}

			var keys []KeyRaw
			err := tx.Table("keys").Select("id, name, setting").Find(&keys).Error
			if err != nil {
				logger.SysLog("查询token列表失败: " + err.Error())
				return err
			}

			// 遍历每个 token，转换 limits 结构
			for _, key := range keys {
				// 解析为 map 以便灵活处理
				var settingMap map[string]interface{}
				err = json.Unmarshal([]byte(key.Setting), &settingMap)
				if err != nil || settingMap == nil {
					// 如果解析失败或为空，跳过
					continue
				}

				// 检查是否有 limits 字段
				limitsRaw, exists := settingMap["limits"]
				if !exists || limitsRaw == nil {
					continue
				}

				// 将 limits 转换为 map
				limitsMap, ok := limitsRaw.(map[string]interface{})
				if !ok {
					continue
				}

				// 检查是否已经是新结构（包含 limit_model_setting）
				if _, hasNew := limitsMap["limit_model_setting"]; hasNew {
					// 已经是新结构，跳过
					continue
				}

				// 检查是否是旧结构（包含 enabled 或 models 字段，说明是直接在 limits 下的旧结构）
				_, hasEnabled := limitsMap["enabled"]
				_, hasModels := limitsMap["models"]
				if !hasEnabled && !hasModels {
					// 既没有 enabled 也没有 models，说明不是旧结构，跳过
					continue
				}

				// 转换为新结构：将旧的 limits 内容移到 limit_model_setting 下
				newLimits := map[string]interface{}{
					"limit_model_setting": limitsMap,
					"limits_ip_setting":   LimitsIPSetting{},
				}

				// 更新 settingMap
				settingMap["limits"] = newLimits

				// 序列化回 JSON
				newSettingBytes, err := json.Marshal(settingMap)
				if err != nil {
					logger.SysLog("token setting序列化失败: " + err.Error())
					continue
				}

				// 更新数据库
				err = tx.Model(&Key{}).Where("id = ?", key.Id).Update("setting", datatypes.JSON(newSettingBytes)).Error
				if err != nil {
					logger.SysLog("更新token setting失败: " + err.Error())
					continue
				}
			}

			logger.SysLog("Token表setting字段limits结构升级完成")
			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			// 回滚：将新结构转回旧结构
			var keys []Key
			err := tx.Find(&keys).Error
			if err != nil {
				return err
			}

			for _, key := range keys {
				settingBytes, err := key.Setting.MarshalJSON()
				if err != nil {
					continue
				}

				var settingMap map[string]interface{}
				err = json.Unmarshal(settingBytes, &settingMap)
				if err != nil || settingMap == nil {
					continue
				}

				limitsRaw, exists := settingMap["limits"]
				if !exists || limitsRaw == nil {
					continue
				}

				limitsMap, ok := limitsRaw.(map[string]interface{})
				if !ok {
					continue
				}

				// 检查是否有 limit_model_setting
				modelSettingRaw, hasModelSetting := limitsMap["limit_model_setting"]
				if !hasModelSetting {
					continue
				}

				// 将 limit_model_setting 的内容提升到 limits 层级
				settingMap["limits"] = modelSettingRaw

				newSettingBytes, err := json.Marshal(settingMap)
				if err != nil {
					continue
				}

				tx.Model(&Key{}).Where("id = ?", key.Id).Update("setting", datatypes.JSON(newSettingBytes))
			}

			return nil
		},
	}
}

func addLogKeyID() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603240001",
		Migrate: func(tx *gorm.DB) error {
			if !tx.Migrator().HasTable("logs") {
				return nil
			}

			if !tx.Migrator().HasColumn(&Log{}, "key_id") {
				if err := tx.Migrator().AddColumn(&Log{}, "KeyId"); err != nil {
					return err
				}
			}

			if !tx.Migrator().HasIndex(&Log{}, "idx_logs_key_id") {
				if err := tx.Migrator().CreateIndex(&Log{}, "KeyId"); err != nil {
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func widenGroupColumns() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603240002",
		Migrate: func(tx *gorm.DB) error {
			dialect := tx.Dialector.Name()

			if tx.Migrator().HasTable("channels") {
				var err error
				switch dialect {
				case "mysql":
					err = tx.Exec("ALTER TABLE channels MODIFY COLUMN `group` varchar(1024) DEFAULT 'default'").Error
				case "postgres":
					err = tx.Exec(`ALTER TABLE "channels" ALTER COLUMN "group" TYPE varchar(1024)`).Error
					if err == nil {
						err = tx.Exec(`ALTER TABLE "channels" ALTER COLUMN "group" SET DEFAULT 'default'`).Error
					}
				}
				if err != nil {
					logger.SysLog("扩容 channels.group 字段失败: " + err.Error())
					return err
				}
			}

			if tx.Migrator().HasTable("users") {
				var err error
				switch dialect {
				case "mysql":
					err = tx.Exec("ALTER TABLE users MODIFY COLUMN `group` varchar(50) DEFAULT 'default'").Error
				case "postgres":
					err = tx.Exec(`ALTER TABLE "users" ALTER COLUMN "group" TYPE varchar(50)`).Error
					if err == nil {
						err = tx.Exec(`ALTER TABLE "users" ALTER COLUMN "group" SET DEFAULT 'default'`).Error
					}
				}
				if err != nil {
					logger.SysLog("调整 users.group 字段失败: " + err.Error())
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func addSubscriptionPlanPriceCurrency() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603290001",
		Migrate: func(tx *gorm.DB) error {
			if tx.Migrator().HasTable("orders") {
				switch tx.Dialector.Name() {
				case "mysql":
					if err := tx.Exec("ALTER TABLE orders MODIFY COLUMN amount decimal(10,2) DEFAULT 0").Error; err != nil {
						return err
					}
				case "postgres":
					if err := tx.Exec(`ALTER TABLE "orders" ALTER COLUMN "amount" TYPE numeric(10,2) USING "amount"::numeric(10,2)`).Error; err != nil {
						return err
					}
					if err := tx.Exec(`ALTER TABLE "orders" ALTER COLUMN "amount" SET DEFAULT 0`).Error; err != nil {
						return err
					}
				}

				if tx.Migrator().HasColumn(&Order{}, "amount_currency") {
					if err := tx.Model(&Order{}).
						Where("amount_currency = '' OR amount_currency IS NULL").
						Update("amount_currency", CurrencyTypeUSD).Error; err != nil {
						return err
					}
				}
			}

			if tx.Migrator().HasTable("subscription_plans") && tx.Migrator().HasColumn(&SubscriptionPlan{}, "price_currency") {
				if err := tx.Model(&SubscriptionPlan{}).
					Where("price_currency = '' OR price_currency IS NULL").
					Update("price_currency", CurrencyTypeUSD).Error; err != nil {
					return err
				}
			}

			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}

func migrationAfter(db *gorm.DB) error {
	// 从库不执行
	if !config.IsMasterNode {
		logger.SysLog("从库不执行迁移后操作")
		return nil
	}
	m := gormigrate.New(db, gormigrate.DefaultOptions, []*gormigrate.Migration{
		addStatistics(),
		changeChannelApiVersion(),
		initUserGroup(),
		addUserGroupDefaultFlag(),
		addOldTokenMaxId(),
		addExtraRatios(),
		migratePricingToUSD(),
		migrateReliableUsersToCommon(),
		removeDeprecatedOAuthAuth(),
		migrateTokenLimitsStructure(),
		migrateQuotaScaleToMicroUSD(),
		addLogKeyID(),
		widenGroupColumns(),
		addSubscriptionPlanPriceCurrency(),
	})
	return m.Migrate()
}

func EnsureQuotaScaleConsistency(db *gorm.DB) error {
	if !config.IsMasterNode {
		return nil
	}

	return db.Transaction(func(tx *gorm.DB) error {
		legacyQuotaPerUnit, shouldRepair, err := detectLegacyQuotaScale(tx)
		if err != nil {
			return err
		}
		if !shouldRepair {
			return nil
		}

		logger.SysLog("detected legacy quota scale after migrations, applying compatibility repair")
		return applyQuotaScaleMigration(tx, legacyQuotaPerUnit)
	})
}
