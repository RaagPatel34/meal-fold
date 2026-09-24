import {sqliteTable,text,integer,index,primaryKey} from 'drizzle-orm/sqlite-core';
export const meals=sqliteTable('meals',{id:text('id').primaryKey(),userId:text('user_id').notNull(),date:text('date').notNull(),name:text('name').notNull(),period:text('period').notNull(),items:text('items').notNull(),createdAt:integer('created_at').notNull()},t=>[index('idx_meals_user_date').on(t.userId,t.date),index('idx_meals_user_created').on(t.userId,t.createdAt)]);

export const trackingPreferences=sqliteTable('tracking_preferences',{userId:text('user_id').primaryKey(),goals:text('goals').notNull()});
export const favoriteMeals=sqliteTable('favorite_meals',{userId:text('user_id').notNull(),id:text('id').notNull(),meal:text('meal').notNull(),createdAt:integer('created_at').notNull()},t=>[primaryKey({columns:[t.userId,t.id]})]);
